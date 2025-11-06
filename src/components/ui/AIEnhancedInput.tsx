import * as React from "react";
import { Input } from "./input";
import { Label } from "./label";
import { Badge } from "./badge";
import { Button } from "./button";
import { Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "../../lib/utils";

interface AIExtractionInfo {
  isAiExtracted: boolean;
  fieldName: string;
  confidence?: number;
  originalValue?: any;
}

interface AIEnhancedInputProps {
  id: string;
  label: string;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: string;
  step?: string;
  min?: string;
  max?: string;
  aiExtractionInfo?: AIExtractionInfo;
  onAiFeedback?: (fieldName: string, correctedValue: any, confidence: number) => void;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const AIEnhancedInput: React.FC<AIEnhancedInputProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  type = "text",
  step,
  min,
  max,
  aiExtractionInfo,
  onAiFeedback,
  children,
  disabled = false,
  className
}) => {
  const [feedbackGiven, setFeedbackGiven] = React.useState(false);
  const isAiExtracted = aiExtractionInfo?.isAiExtracted;
  const confidence = aiExtractionInfo?.confidence || 0;

  const handlePositiveFeedback = () => {
    if (onAiFeedback && aiExtractionInfo) {
      onAiFeedback(aiExtractionInfo.fieldName, value, confidence);
      setFeedbackGiven(true);
    }
  };

  const handleNegativeFeedback = () => {
    if (onAiFeedback && aiExtractionInfo) {
      onAiFeedback(aiExtractionInfo.fieldName, value, 0);
      setFeedbackGiven(true);
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return "bg-green-100 text-green-800 border-green-300";
    if (conf >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-orange-100 text-orange-800 border-orange-300";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="flex items-center gap-2">
          {label}
          {required && <span className="text-red-500">*</span>}
          {isAiExtracted && (
            <Badge variant="outline" className="text-xs flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-300">
              <Sparkles className="h-3 w-3" />
              AI Extracted
            </Badge>
          )}
        </Label>

        {isAiExtracted && confidence > 0 && (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs", getConfidenceColor(confidence))}
            >
              {Math.round(confidence * 100)}% confidence
            </Badge>

            {!feedbackGiven && onAiFeedback && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePositiveFeedback}
                  className="h-6 w-6 p-0 hover:bg-green-50"
                  title="Correct extraction"
                >
                  <ThumbsUp className="h-3 w-3 text-green-600" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleNegativeFeedback}
                  className="h-6 w-6 p-0 hover:bg-red-50"
                  title="Incorrect extraction"
                >
                  <ThumbsDown className="h-3 w-3 text-red-600" />
                </Button>
              </div>
            )}

            {feedbackGiven && (
              <span className="text-xs text-gray-500">Thanks for feedback!</span>
            )}
          </div>
        )}
      </div>

      {children ? (
        <div className={cn(
          "relative",
          isAiExtracted && "ring-2 ring-blue-200 rounded-md"
        )}>
          {children}
        </div>
      ) : (
        <Input
          id={id}
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          step={step}
          min={min}
          max={max}
          className={cn(
            error && "border-red-500 focus:ring-red-500",
            isAiExtracted && "ring-2 ring-blue-200"
          )}
        />
      )}

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
};

export default AIEnhancedInput;
