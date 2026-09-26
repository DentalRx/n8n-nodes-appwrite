module.exports = async ({ req, res, log }) => {
	log('n8n live test');
	return res.json({
		ok: true,
		method: req.method,
		body: req.bodyText,
		greeting: process.env.GREETING ?? null,
	});
};
