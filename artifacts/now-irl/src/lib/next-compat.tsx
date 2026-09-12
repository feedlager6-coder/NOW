import { useLocation } from "wouter";
import { Link as WouterLink } from "wouter";

export const Link = WouterLink;
export { useLocation };

export function useRouter() {
  const [, navigate] = useLocation();

  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
    back: () => window.history.back(),
  };
}

export function useSearchParams() {
  const [location] = useLocation();
  return new URLSearchParams(location.split("?")[1] ?? "");
}