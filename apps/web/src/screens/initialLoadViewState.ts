export type InitialLoadViewState = 'loading' | 'failure' | 'content';

export function initialLoadViewState(loading: boolean, loadFailed: boolean): InitialLoadViewState {
  if (loading) return 'loading';
  return loadFailed ? 'failure' : 'content';
}
