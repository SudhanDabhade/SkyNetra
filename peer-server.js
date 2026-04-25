import { PeerServer } from 'peer';

const PORT = 9000;
const peerServer = PeerServer({ port: PORT, path: '/peerjs' });

peerServer.on('connection', (client) => {
  console.log(`✅ Peer connected: ${client}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`❌ Peer disconnected: ${client}`);
});

console.log(`🚀 Local PeerJS server running at http://localhost:${PORT}/peerjs`);
