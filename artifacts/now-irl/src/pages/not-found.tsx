import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@workspace/now-design-system/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">
              Страница не найдена
            </h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Похоже, эта страница ещё не зажглась.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
