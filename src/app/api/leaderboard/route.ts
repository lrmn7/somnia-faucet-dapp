import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { parseEther } from 'ethers';

interface PostBody {
    senderAddress: string;
    amountSent: string;
}


export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db("somnia_testnet");

        const leaderboard = await db
            .collection("transactions")
            .find({})
            .sort({ totalSentWei: -1 })
            .limit(20)
            .toArray();

        const sanitizedLeaderboard = leaderboard.map(item => ({
            ...item,
            totalSentWei: item.totalSentWei.toString(),
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
        const db = client.db("somnia_testnet");
        const collection = db.collection("transactions");

        const amountWei = parseEther(amountSent);

        await collection.findOneAndUpdate(
            { walletAddress: senderAddress.toLowerCase() },
            {
                $inc: {
                    txCount: 1,
                    totalSentWei: amountWei,
                },
                $setOnInsert: { walletAddress: senderAddress.toLowerCase() }
            },
            { upsert: true }
        );

        return NextResponse.json({ message: "Transaction recorded" }, { status: 201 });

    } catch (error) {
        console.error("Error recording transaction:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}