import './config'; // Must be first: loads dotenv before any module reads process.env
import { createApp } from './app';

const app  = createApp();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
