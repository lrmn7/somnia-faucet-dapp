import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { parseEther } from 'ethers';
import { Decimal128 } from 'mongodb';

interface PostBody {
    senderAddress: string;
    amountSent: string;
}

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db("somcet");

        const leaderboard = await db
            .collection("transactions")
            .find({})
            .sort({ totalSentWei: -1 })
            .limit(20)
            .toArray();
        const sanitizedLeaderboard = leaderboard.map(item => ({
            _id: item._id.toString(),
            walletAddress: item.walletAddress,
            txCount: item.txCount,
            totalSentWei: item.totalSentWei ? item.totalSentWei.toString() : "0",
        }));

        return NextResponse.json(sanitizedLeaderboard, { status: 200 });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { senderAddress, amountSent }: PostBody = await request.json();

        if (!senderAddress || !amountSent) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("somcet");
        const collection = db.collection("transactions");
        const amountWeiBigInt = parseEther(amountSent);
        const existingEntry = await collection.findOne({ walletAddress: senderAddress.toLowerCase() });

        let newTotalSentWeiDecimal;

        if (existingEntry && existingEntry.totalSentWei) {
            const currentTotalWeiBigInt = BigInt(existingEntry.totalSentWei.toString());
            
            const summedWeiBigInt = currentTotalWeiBigInt + amountWeiBigInt;
            newTotalSentWeiDecimal = Decimal128.fromString(summedWeiBigInt.toString());
        } else {
            newTotalSentWeiDecimal = Decimal128.fromString(amountWeiBigInt.toString());
        }
        await collection.updateOne(
            { walletAddress: senderAddress.toLowerCase() },
            {
                $inc: { txCount: 1 },
                $set: { totalSentWei: newTotalSentWeiDecimal },
                $setOnInsert: { walletAddress: senderAddress.toLowerCase() }
            },
            { upsert: true }
        );

        return NextResponse.json({ message: "Transaction recorded" }, { status: 201 });

    } catch (error: any) {
        console.error("Error recording transaction:", error);
        return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
    }
}