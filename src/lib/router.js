import { useEffect, useState } from 'react';

/** Minimaler Hash-Router: #/play/ABCD → { name: 'play', params: ['ABCD'] } */
function parse() {
  const [name = '', ...params] = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name, params };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path) {
  window.location.hash = path;
}
