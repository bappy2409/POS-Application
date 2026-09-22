export function notFoundHandler(request, response) {
  response.status(404).json({ error: `Route not found: ${request.method} ${request.originalUrl}` });
}

export function errorHandler(error, _request, response, _next) {
  console.error(error);
  if (error.code === 'P2002') return response.status(409).json({ error: 'A record with that unique value already exists' });
  if (error.code === 'P2003') return response.status(409).json({ error: 'This record is still referenced and cannot be deleted' });
  if (error.code === 'P2025') return response.status(404).json({ error: 'Record not found' });
  const status = Number.isInteger(error.status) ? error.status : 500;
  return response.status(status).json({ error: status === 500 ? 'Internal server error' : error.message });
}
