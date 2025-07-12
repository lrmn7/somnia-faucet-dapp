import clientPromise from '@/lib/mongodb';
import { ChangeStream } from 'mongodb';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const client = await clientPromise;
    const db = client.db("somcet");
    const collection = db.collection("transactions");

    let changeStream: ChangeStream;

    const stream = new ReadableStream({
        async start(controller) {
            changeStream = collection.watch();

            changeStream.on('change', async () => {
                console.log("Database changed! Fetching new leaderboard...");
                
                const updatedLeaderboard = await collection
                    .find({})
                    .sort({ totalSentWei: -1 })
                    .limit(20)
                    .toArray();
                const sanitizedLeaderboard = updatedLeaderboard.map(item => ({
                    _id: item._id.toString(),
                    walletAddress: item.walletAddress,
                    txCount: item.txCount,
                    totalSentWei: item.totalSentWei ? item.totalSentWei.toString() : "0",
                }));
                
                try {
                    controller.enqueue(`data: ${JSON.stringify(sanitizedLeaderboard)}\n\n`);
                } catch (error) {
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
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}