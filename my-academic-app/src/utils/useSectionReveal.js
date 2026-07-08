import { useLayoutEffect, useRef } from 'react';

// Fades/rises each registered element into view once as it scrolls in.
// Mirrors the observer pattern used on DashboardPage; pair each ref with
// a wrapper that has className="section-reveal".
export function useSectionReveal() {
  const sectionsRef = useRef([]);

  const registerReveal = (el) => {
    if (!el) return;
    if (!sectionsRef.current.includes(el)) {
      sectionsRef.current.push(el);
    }
  };

  useLayoutEffect(() => {
    const nodes = sectionsRef.current.filter(Boolean);
    if (!nodes.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return registerReveal;
}
