// pages/api/stream.ts atau app/api/stream/route.ts
// (Tergantung struktur Next.js Anda)

import clientPromise from '@/lib/mongodb';
import { ChangeStream } from 'mongodb';
export const dynamic = 'force-dynamic'; // Penting untuk Server-Sent Events di Next.js

export async function GET(request: Request) {
    const client = await clientPromise;
    const db = client.db("somcet");
    const collection = db.collection("transactions");

    let changeStream: ChangeStream;

    const stream = new ReadableStream({
        async start(controller) { // Pastikan start adalah async
            changeStream = collection.watch();

            changeStream.on('change', async () => {
                console.log("Database changed! Fetching new leaderboard...");
                
                const updatedLeaderboard = await collection
                    .find({})
                    .sort({ totalSentWei: -1 })
                    .limit(20)
                    .toArray();

                // Pastikan totalSentWei dikonversi ke string sebelum dikirim melalui stream
                const sanitizedLeaderboard = updatedLeaderboard.map(item => ({
                    _id: item._id.toString(), // _id dari MongoDB adalah ObjectId, perlu di-string-kan
                    walletAddress: item.walletAddress,
                    txCount: item.txCount,
                    totalSentWei: item.totalSentWei ? item.totalSentWei.toString() : "0", // Konversi Decimal128 ke string
                }));
                
                try {
                    // Kirim data sebagai Server-Sent Event
                    controller.enqueue(`data: ${JSON.stringify(sanitizedLeaderboard)}\n\n`);
                } catch (error) {
                    // Ini bisa terjadi jika klien menutup koneksi SSE
                    console.log("Could not enqueue data, stream likely closed by client.", error);
                }
            });

            // Tangani pemutusan koneksi klien
            request.signal.onabort = () => {
                console.log("Client disconnected. Closing MongoDB change stream.");
                changeStream.close();
                controller.close();
            };
        },
        // opsional: cancel(reason) { ... } jika ada logika pembersihan tambahan
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}