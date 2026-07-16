export function useDiagramsApi() {
  const { request } = useApi();

  const listDiagrams = () => request<any[]>('/diagrams');

  const createDiagram = (name: string, serialized_object: string) =>
    request<any>('/diagrams', {
      method: 'POST',
      body: { name, serialized_object },
    });

  const updateDiagram = (id: string, serialized_object: string) =>
    request<any>(`/diagrams/${id}`, {
      method: 'PUT',
      body: { serialized_object },
    });

  return { listDiagrams, createDiagram, updateDiagram };
}