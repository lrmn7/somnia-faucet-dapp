// pages/api/leaderboard/route.ts atau app/api/leaderboard/route.ts
// (Tergantung struktur Next.js Anda, untuk Next.js 13+ App Router)

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { parseEther } from 'ethers';
import { Decimal128 } from 'mongodb'; // Penting: Import Decimal128

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

        // Pastikan totalSentWei dikonversi ke string sebelum dikirim ke frontend
        const sanitizedLeaderboard = leaderboard.map(item => ({
            _id: item._id.toString(), // _id dari MongoDB adalah ObjectId, perlu di-string-kan
            walletAddress: item.walletAddress,
            txCount: item.txCount,
            totalSentWei: item.totalSentWei ? item.totalSentWei.toString() : "0", // Konversi Decimal128 ke string
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

        // 1. Konversi amountSent (string Ether) ke Wei (BigInt)
        // Ini memastikan jumlah yang dikirim adalah dalam unit Wei yang tepat
        const amountWeiBigInt = parseEther(amountSent);

        // 2. Cari entri leaderboard untuk alamat pengirim
        const existingEntry = await collection.findOne({ walletAddress: senderAddress.toLowerCase() });

        let newTotalSentWeiDecimal;

        if (existingEntry && existingEntry.totalSentWei) {
            // Jika entri sudah ada dan totalSentWei ada
            // Asumsi existingEntry.totalSentWei adalah Decimal128 atau string lama
            // Kita harus mengonversi ke BigInt untuk penjumlahan presisi
            const currentTotalWeiBigInt = BigInt(existingEntry.totalSentWei.toString());
            
            const summedWeiBigInt = currentTotalWeiBigInt + amountWeiBigInt;
            
            // Konversi kembali BigInt hasil penjumlahan ke Decimal128 sebelum menyimpan
            newTotalSentWeiDecimal = Decimal128.fromString(summedWeiBigInt.toString());
        } else {
            // Jika entri baru atau totalSentWei belum ada (kasus pertama kali transaksi)
            // Konversi BigInt dari amountWeiBigInt ke Decimal128 untuk penyimpanan awal
            newTotalSentWeiDecimal = Decimal128.fromString(amountWeiBigInt.toString());
        }

        // 3. Update atau Insert entri
        // Gunakan $set untuk totalSentWei yang sudah kita hitung secara presisi
        await collection.updateOne(
            { walletAddress: senderAddress.toLowerCase() },
            {
                $inc: { txCount: 1 }, // txCount bisa tetap $inc karena ini integer biasa
                $set: { totalSentWei: newTotalSentWeiDecimal }, // Penting: Gunakan $set dengan Decimal128
                $setOnInsert: { walletAddress: senderAddress.toLowerCase() } // Tambahkan walletAddress saat upsert jika belum ada
            },
            { upsert: true }
        );

        return NextResponse.json({ message: "Transaction recorded" }, { status: 201 });

    } catch (error: any) {
        console.error("Error recording transaction:", error);
        return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
    }
}