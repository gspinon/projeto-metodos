import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

const clientDir = path.join(process.cwd(), 'dist', 'client');

app.use(express.static(clientDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Slot Machine running at http://localhost:${PORT}`);
});
