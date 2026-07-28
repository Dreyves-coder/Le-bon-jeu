module.exports = (error, _req, res, _next) => {
  console.error(error);

  const statusCode = Number(error.statusCode) || 500;
  const safeMessage = statusCode >= 500
    ? 'Le service rencontre un problème temporaire.'
    : error.message || 'La requête a échoué.';

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
  });
};
