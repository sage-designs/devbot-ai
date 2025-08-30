import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  TrendingUpIcon, 
  ZapIcon,
  BarChart3Icon,
  ShieldCheckIcon 
} from 'lucide-react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';

interface AgenticArtifactToolbarProps {
  artifactId: string;
  artifactKind: string;
  artifactTitle: string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  isCurrentVersion: boolean;
}

export function AgenticArtifactToolbar({
  artifactId,
  artifactKind,
  artifactTitle,
  sendMessage,
  isCurrentVersion,
}: AgenticArtifactToolbarProps) {
  const handleAgenticCreate = () => {
    sendMessage({
      role: 'user',
      parts: [
        {
          type: 'text',
          text: `Create an enhanced ${artifactKind} artifact using agentic AI with multi-step generation and quality evaluation. Title: "${artifactTitle}"`,
        },
      ],
    });
  };

  const handleEvaluateQuality = () => {
    sendMessage({
      role: 'user',
      parts: [
        {
          type: 'text',
          text: `Evaluate the quality of this ${artifactKind} artifact (ID: ${artifactId}) using specialized AI agents. Provide detailed quality metrics and improvement suggestions.`,
        },
      ],
    });
  };

  const handleOptimizePerformance = () => {
    sendMessage({
      role: 'user',
      parts: [
        {
          type: 'text',
          text: `Optimize this ${artifactKind} artifact (ID: ${artifactId}) for performance, maintainability, and user experience using agentic AI.`,
        },
      ],
    });
  };

  const handleOptimizeAccessibility = () => {
    sendMessage({
      role: 'user',
      parts: [
        {
          type: 'text',
          text: `Optimize this ${artifactKind} artifact (ID: ${artifactId}) for accessibility and WCAG compliance using specialized agents.`,
        },
      ],
    });
  };

  const handleSecurityAudit = () => {
    sendMessage({
      role: 'user',
      parts: [
        {
          type: 'text',
          text: `Perform a security audit and optimization of this ${artifactKind} artifact (ID: ${artifactId}) using security-focused agents.`,
        },
      ],
    });
  };

  const handleAggressiveOptimization = () => {
    sendMessage({
      role: 'user',
      parts: [
        {
          type: 'text',
          text: `Perform aggressive optimization of this ${artifactKind} artifact (ID: ${artifactId}) focusing on performance, security, accessibility, and maintainability.`,
        },
      ],
    });
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Agentic AI Tools
          </span>
          <Badge variant="secondary" className="text-xs">
            Enhanced
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleAgenticCreate}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 text-xs"
              >
                <SparklesIcon className="h-3 w-3" />
                Agentic Create
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create enhanced artifact with multi-step AI generation</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleEvaluateQuality}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 text-xs"
                disabled={!isCurrentVersion}
              >
                <BarChart3Icon className="h-3 w-3" />
                Evaluate
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Evaluate quality with specialized AI agents</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleOptimizePerformance}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 text-xs"
                disabled={!isCurrentVersion}
              >
                <TrendingUpIcon className="h-3 w-3" />
                Optimize
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Optimize for performance and maintainability</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleOptimizeAccessibility}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 text-xs"
                disabled={!isCurrentVersion}
              >
                <CheckCircleIcon className="h-3 w-3" />
                A11y
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Optimize for accessibility and WCAG compliance</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSecurityAudit}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 text-xs"
                disabled={!isCurrentVersion}
              >
                <ShieldCheckIcon className="h-3 w-3" />
                Security
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Security audit and vulnerability fixes</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleAggressiveOptimization}
                size="sm"
                variant="default"
                className="flex items-center gap-2 text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={!isCurrentVersion}
              >
                <ZapIcon className="h-3 w-3" />
                Max Optimize
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Comprehensive optimization with all agents</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="text-xs text-muted-foreground">
          Enhanced AI agents provide superior quality through multi-step generation, evaluation, and optimization.
        </div>
      </div>
    </TooltipProvider>
  );
}
