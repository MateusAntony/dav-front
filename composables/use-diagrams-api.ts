export function useDiagramsApi() {
  const { request } = useApi();

  const listDiagrams = () => request<any[]>('/diagrams');

  const getDiagram = (id: string) => request<any>(`/diagrams/${id}`);

  const createDiagram = (name: string, serialized_object: string) =>
    request<any>('/diagrams', {
      method: 'POST',
      body: { name, serialized_object },
    });

  const updateDiagram = (
    id: string,
    serialized_object: string,
    name?: string,
  ) =>
    request<any>(`/diagrams/${id}`, {
      method: 'PUT',
      body: { serialized_object, ...(name ? { name } : {}) },
    });

  const setPublicShare = (id: string, enabled: boolean) =>
    request<any>(`/diagrams/${id}/shares/public`, {
      method: 'POST',
      body: { enabled },
    });

  const shareWithUser = (id: string, email: string) =>
    request<{ message: string }>(`/diagrams/${id}/shares`, {
      method: 'POST',
      body: { email },
    });

  const listShares = (id: string) => request<any[]>(`/diagrams/${id}/shares`);

  const removeShare = (id: string, shareId: string) =>
    request<void>(`/diagrams/${id}/shares/${shareId}`, { method: 'DELETE' });

  const getPublicDiagram = (token: string) => request<any>(`/public/diagrams/${token}`);

  return { listDiagrams, getDiagram, createDiagram, updateDiagram, setPublicShare, shareWithUser, listShares, removeShare, getPublicDiagram };
}
