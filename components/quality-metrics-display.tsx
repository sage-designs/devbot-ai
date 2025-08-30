import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react';
import type { QualityMetrics } from '@/lib/ai/agents/types';

interface QualityMetricsDisplayProps {
  metrics: QualityMetrics;
  artifactKind: string;
}

export function QualityMetricsDisplay({ metrics, artifactKind }: QualityMetricsDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 8) return 'default';
    if (score >= 6) return 'secondary';
    return 'destructive';
  };

  const getProgressColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 text-blue-600" />
          Quality Assessment
          <Badge variant="outline" className="ml-auto">
            {artifactKind.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Quality</span>
            <Badge variant={getScoreBadgeVariant(metrics.overall)}>
              {metrics.overall.toFixed(1)}/10
            </Badge>
          </div>
          <Progress 
            value={metrics.overall * 10} 
            className="h-2"
          />
        </div>

        <Separator />

        {/* Specific Metrics */}
        {Object.keys(metrics.specific).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Detailed Metrics</h4>
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(metrics.specific).map(([key, score]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className={`text-sm font-medium ${getScoreColor(score)}`}>
                      {score.toFixed(1)}/10
                    </span>
                  </div>
                  <Progress 
                    value={score * 10} 
                    className="h-1"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues */}
        {metrics.issues.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="h-4 w-4 text-orange-500" />
                <h4 className="text-sm font-medium">Issues Identified</h4>
              </div>
              <ul className="space-y-1">
                {metrics.issues.map((issue, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Suggestions */}
        {metrics.suggestions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <InfoIcon className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-medium">Improvement Suggestions</h4>
              </div>
              <ul className="space-y-1">
                {metrics.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Quality Status */}
        <div className="flex items-center justify-center p-3 rounded-lg bg-muted">
          <div className="flex items-center gap-2">
            {metrics.needsImprovement ? (
              <>
                <AlertTriangleIcon className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  Needs Improvement
                </span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Quality Standards Met
                </span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
