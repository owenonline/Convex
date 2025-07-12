import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Plus, MessageSquare, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewConversation
}: ConversationSidebarProps) {
  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border">
        <Button
          onClick={onNewConversation}
          className="w-full justify-start gap-2 bg-sidebar-accent hover:bg-sidebar-accent/80"
          variant="ghost"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-sidebar-accent ${
                activeConversationId === conversation.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'
              }`}
              onClick={() => onConversationSelect(conversation.id)}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{conversation.title}</div>
                <div className="text-xs text-sidebar-foreground/60 truncate">
                  {conversation.lastMessage}
                </div>
              </div>
              
              {/* Options Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Rename</DropdownMenuItem>
                  <DropdownMenuItem>Share</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/60 text-center">
          Desktop Workspace
        </div>
      </div>
    </div>
  );
}