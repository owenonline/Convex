import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MessageSquare, GitBranch, User, Bot, ArrowUp } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isInherited?: boolean;
}

interface Branch {
  id: string;
  name: string;
  parentBranchId?: string;
  parentMessageId?: string;
  messages: Message[];
  summary: string;
  position: { x: number; y: number };
  level: number;
}

interface ConversationBlockProps {
  branch: Branch;
  isActive: boolean;
  onSelect: () => void;
  showConnection?: boolean;
  onNavigateToMessage?: (branchId: string, messageId: string) => void;
  highlightedMessageId?: string;
}

export function ConversationBlock({ 
  branch, 
  isActive, 
  onSelect,
  showConnection = false,
  onNavigateToMessage,
  highlightedMessageId
}: ConversationBlockProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inheritedMessages = branch.messages.filter(m => m.isInherited);
  const newMessages = branch.messages.filter(m => !m.isInherited);
  const hasNewMessages = newMessages.length > 0;

  // Auto-scroll to highlighted message
  useEffect(() => {
    if (highlightedMessageId && scrollAreaRef.current) {
      // Find the viewport within the scroll area
      const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (viewport) {
        const messageElement = viewport.querySelector(`[data-message-id="${highlightedMessageId}"]`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [highlightedMessageId]);

  const handleInheritedMessageClick = (message: Message, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent branch selection
    
    if (branch.parentBranchId && onNavigateToMessage) {
      // Find the original message ID (remove the 'inherited-' prefix)
      const originalMessageId = message.id.startsWith('inherited-') 
        ? message.id.replace('inherited-', '') 
        : message.id;
      
      onNavigateToMessage(branch.parentBranchId, originalMessageId);
    }
  };

  return (
    <div 
      className={`w-80 bg-card border rounded-xl shadow-lg cursor-pointer transition-all ${
        isActive 
          ? 'border-primary shadow-xl ring-2 ring-primary/20' 
          : 'border-border hover:border-accent-foreground/20 hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      {/* Header with Summary */}
      <div className="p-4 border-b border-border bg-muted/30 rounded-t-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
              {branch.name}
            </Badge>
            {branch.level > 0 && (
              <span className="text-xs text-muted-foreground">L{branch.level}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {inheritedMessages.length > 0 && (
              <div className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                {inheritedMessages.length}
              </div>
            )}
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {newMessages.length}
            </div>
          </div>
        </div>
        <div className="text-sm text-foreground/80 line-clamp-2">
          {branch.summary}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="h-80 conversation-block-content" ref={scrollAreaRef}>
        <div className="p-4 space-y-3">
          {branch.messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No messages yet
            </div>
          ) : (
            <>
              {/* Inherited Messages (Greyed Out and Clickable) */}
              {inheritedMessages.length > 0 && (
                <div className="space-y-2 pb-4 border-b border-dashed border-border/50">
                  <div className="text-xs text-muted-foreground/60 flex items-center gap-1 mb-2">
                    <ArrowUp className="h-3 w-3" />
                    From parent branch (click to navigate)
                  </div>
                  {inheritedMessages.map((message) => {
                    const originalMessageId = message.id.startsWith('inherited-') 
                      ? message.id.replace('inherited-', '') 
                      : message.id;
                    const isHighlighted = highlightedMessageId === originalMessageId;
                    
                    return (
                      <div 
                        key={message.id}
                        data-message-id={originalMessageId}
                        className={`flex gap-3 opacity-50 hover:opacity-70 cursor-pointer transition-opacity ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        } ${isHighlighted ? 'ring-2 ring-primary/50 rounded-lg' : ''}`}
                        onClick={(e) => handleInheritedMessageClick(message, e)}
                        title="Click to navigate to this message in the parent branch"
                      >
                        {message.role === 'assistant' && (
                          <div className="w-6 h-6 rounded-full bg-muted border flex items-center justify-center flex-shrink-0">
                            <Bot className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        
                        <div 
                          className={`max-w-[70%] p-3 rounded-lg text-sm border border-dashed hover:border-primary/30 transition-colors ${
                            message.role === 'user'
                              ? 'bg-muted/50 text-muted-foreground ml-auto'
                              : 'bg-muted/30 text-muted-foreground'
                          }`}
                        >
                          {message.content}
                        </div>
                        
                        {message.role === 'user' && (
                          <div className="w-6 h-6 rounded-full bg-muted border flex items-center justify-center flex-shrink-0">
                            <User className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* New Messages */}
              {newMessages.map((message) => {
                const isHighlighted = highlightedMessageId === message.id;
                
                return (
                  <div 
                    key={message.id}
                    data-message-id={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    } ${isHighlighted ? 'ring-2 ring-primary/50 rounded-lg p-1 -m-1' : ''}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Bot className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    
                    <div 
                      className={`max-w-[70%] p-3 rounded-lg text-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {message.content}
                    </div>
                    
                    {message.role === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/20 rounded-b-xl">
        <div className="text-xs text-muted-foreground text-center">
          {hasNewMessages 
            ? `Last: ${new Date(newMessages[newMessages.length - 1].timestamp).toLocaleTimeString()}`
            : inheritedMessages.length > 0
            ? 'Continue from parent'
            : 'Start conversation'
          }
        </div>
      </div>
    </div>
  );
}