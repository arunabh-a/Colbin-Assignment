import { app } from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// FOR DEPLOYMENT TO RENDER: Pinging Express server every 14 minutes to maintain traffic consistency
setInterval(async () => {
    try {
        const response = await fetch(`http://localhost:${PORT}/health`);
        console.log(`Server ping at ${new Date().toISOString()}: ${response.status}`);
    } catch (error) {
        console.log(`Server ping failed at ${new Date().toISOString()}:`, error);
    }
}, 14 * 60 * 1000);

export default app;
