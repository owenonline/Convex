import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Send, Paperclip, Mic, Square, GitBranch, Plus, ArrowUp, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

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

interface ChatBarProps {
  selectedTool: string;
  selectedModel: string;
  onToolChange: (tool: string) => void;
  onModelChange: (model: string) => void;
  onSendMessage: (content: string) => void;
  onCreateBranch: () => void;
  activeBranch?: Branch;
  availableBranches: Branch[];
  onSwitchBranch: (branchId: string) => void;
}

export function ChatBar({
  selectedTool,
  selectedModel,
  onToolChange,
  onModelChange,
  onSendMessage,
  onCreateBranch,
  activeBranch,
  availableBranches,
  onSwitchBranch
}: ChatBarProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const tools = [
    { value: 'cursor', label: 'Cursor' },
    { value: 'pencil', label: 'Pencil' },
    { value: 'eraser', label: 'Eraser' },
    { value: 'select', label: 'Select' },
  ];

  const models = [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5', label: 'GPT-3.5' },
    { value: 'claude', label: 'Claude' },
    { value: 'llama', label: 'Llama' },
  ];

  const canCreateBranch = activeBranch && activeBranch.messages.some(m => !m.isInherited);
  const inheritedCount = activeBranch?.messages.filter(m => m.isInherited).length || 0;
  const newMessageCount = activeBranch?.messages.filter(m => !m.isInherited).length || 0;

  // Group branches by level for better organization
  const branchesByLevel = availableBranches.reduce((acc, branch) => {
    if (!acc[branch.level]) acc[branch.level] = [];
    acc[branch.level].push(branch);
    return acc;
  }, {} as Record<number, Branch[]>);

  return (
    <div className="border-t border-border bg-background">
      {/* Top Bar with Controls */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-4">
          {/* Tool Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tool:</span>
            <Select value={selectedTool} onValueChange={onToolChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select tool" />
              </SelectTrigger>
              <SelectContent>
                {tools.map((tool) => (
                  <SelectItem key={tool.value} value={tool.value}>
                    {tool.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Model:</span>
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateBranch}
              className="gap-2"
              disabled={!canCreateBranch}
              title={!canCreateBranch ? "Send a message first to create a branch" : "Create new branch"}
            >
              <Plus className="h-3 w-3" />
              New Branch
            </Button>
          </div>
        </div>

        {/* Branch Selector and Indicator */}
        <div className="flex items-center gap-3">
          {/* Branch Statistics */}
          {activeBranch && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {inheritedCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <ArrowUp className="h-3 w-3" />
                  {inheritedCount}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                {newMessageCount}
              </Badge>
            </div>
          )}

          {/* Branch Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <GitBranch className="h-4 w-4" />
                Switch Branch
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {Object.entries(branchesByLevel).map(([level, branches]) => (
                <div key={level}>
                  {level !== '0' && <DropdownMenuSeparator />}
                  {level !== '0' && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Level {level}
                    </div>
                  )}
                  {branches.map((branch) => (
                    <DropdownMenuItem
                      key={branch.id}
                      onClick={() => onSwitchBranch(branch.id)}
                      className={activeBranch?.id === branch.id ? 'bg-accent' : ''}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-3 w-3" />
                          <span className="truncate">{branch.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {branch.messages.filter(m => m.isInherited).length > 0 && (
                            <ArrowUp className="h-2 w-2 text-muted-foreground/60" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {branch.messages.filter(m => !m.isInherited).length}
                          </span>
                          {activeBranch?.id === branch.id && (
                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Current Branch Indicator */}
          <Badge variant="secondary" className="gap-1">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            branch {activeBranch?.name || 'main'}
            {activeBranch && activeBranch.level > 0 && (
              <span className="text-xs opacity-60">L{activeBranch.level}</span>
            )}
          </Badge>
        </div>
      </div>

      {/* Chat Input */}
      <div className="p-4">
        <div className="flex items-end gap-3">
          {/* Attachment Button */}
          <Button variant="ghost" size="sm" className="shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                activeBranch?.messages.filter(m => m.isInherited).length 
                  ? "Continue the conversation..." 
                  : "Type your message here..."
              }
              className="pr-12 resize-none min-h-[40px]"
            />
          </div>

          {/* Voice/Send Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRecording(!isRecording)}
              className={isRecording ? 'text-red-500' : ''}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button 
              onClick={handleSend}
              disabled={!message.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}