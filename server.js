// Remove or comment out this line:
// app.listen(process.env.PORT, () => console.log(`Server running...`));

// Add this instead:
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app; // Required for Vercel serverless deployment
