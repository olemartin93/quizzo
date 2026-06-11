async function request(url, options) {
  const res = await fetch(url, options);
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body;
}

export const api = {
  listQuizzes: () => request('/api/quizzes'),
  getQuiz: (id) => request(`/api/quizzes/${id}`),
  createQuiz: (quiz) =>
    request('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quiz),
    }),
  updateQuiz: (id, quiz) =>
    request(`/api/quizzes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quiz),
    }),
  deleteQuiz: (id) => request(`/api/quizzes/${id}`, { method: 'DELETE' }),
};
