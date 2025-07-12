import { useState, useRef } from 'react';
import { ConversationSidebar } from './ConversationSidebar';
import { CanvasArea } from './CanvasArea';
import { ChatBar } from './ChatBar';

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
  level: number; // depth level for positioning
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  branches: Record<string, Branch>;
  activeBranchId: string;
  canvasCenter: { x: number; y: number };
}

export function MainLayout() {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [conversations, setConversations] = useState<Record<string, Conversation>>({
    '1': {
      id: '1',
      title: 'New Conversation',
      lastMessage: 'Welcome to your workspace',
      activeBranchId: 'main',
      canvasCenter: { x: 800, y: 400 }, // Center of a typical viewport
      branches: {
        main: {
          id: 'main',
          name: 'main',
          messages: [],
          summary: 'New conversation',
          position: { x: 800, y: 400 },
          level: 0
        }
      }
    },
    '2': {
      id: '2',
      title: 'Project Ideas',
      lastMessage: 'Let\'s brainstorm some concepts',
      activeBranchId: 'main',
      canvasCenter: { x: 800, y: 400 },
      branches: {
        main: {
          id: 'main',
          name: 'main',
          messages: [
            {
              id: '1',
              content: 'Let\'s brainstorm some project ideas',
              role: 'user',
              timestamp: new Date()
            },
            {
              id: '2',
              content: 'Here are some exciting project ideas we could explore...',
              role: 'assistant',
              timestamp: new Date()
            }
          ],
          summary: 'Brainstorming project concepts',
          position: { x: 800, y: 400 },
          level: 0
        }
      }
    }
  });
  
  const [activeConversationId, setActiveConversationId] = useState('1');
  const [selectedTool, setSelectedTool] = useState('cursor');
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | undefined>(undefined);

  const activeConversation = conversations[activeConversationId];
  const activeBranch = activeConversation?.branches[activeConversation.activeBranchId];

  // Enhanced positioning system with collision detection and smart layout
  const calculateOptimalBranchPositions = (conversation: Conversation): Record<string, { x: number; y: number }> => {
    const branches = Object.values(conversation.branches);
    const positions: Record<string, { x: number; y: number }> = {};
    
    // Constants for layout
    const HORIZONTAL_SPACING = 450; // Space between levels
    const VERTICAL_SPACING = 150; // Minimum vertical space between siblings
    const BLOCK_HEIGHT = 380; // Approximate height of conversation block
    const BLOCK_WIDTH = 320; // Width of conversation block
    
    // Build parent-child relationships
    const childrenMap: Record<string, string[]> = {};
    const parentMap: Record<string, string> = {};
    
    branches.forEach(branch => {
      if (branch.parentBranchId) {
        if (!childrenMap[branch.parentBranchId]) {
          childrenMap[branch.parentBranchId] = [];
        }
        childrenMap[branch.parentBranchId].push(branch.id);
        parentMap[branch.id] = branch.parentBranchId;
      }
    });
    
    // Find root branch (main)
    const rootBranch = branches.find(b => !b.parentBranchId);
    if (!rootBranch) return positions;
    
    // Position root at center
    positions[rootBranch.id] = { ...conversation.canvasCenter };
    
    // Recursive function to position branches using tree layout
    const positionBranch = (branchId: string, depth: number = 0) => {
      const children = childrenMap[branchId] || [];
      if (children.length === 0) return;
      
      const parentPos = positions[branchId];
      if (!parentPos) return;
      
      // Calculate total height needed for all children
      const totalChildren = children.length;
      const totalHeight = Math.max(totalChildren * VERTICAL_SPACING, BLOCK_HEIGHT);
      
      // Start positioning from top
      let startY = parentPos.y - (totalHeight / 2) + (VERTICAL_SPACING / 2);
      
      // Determine if we should go left or right
      // Alternate direction or use load balancing
      const existingRightBranches = Object.values(positions).filter(pos => pos.x > parentPos.x).length;
      const existingLeftBranches = Object.values(positions).filter(pos => pos.x < parentPos.x).length;
      
      children.forEach((childId, index) => {
        // Alternate sides or use the less crowded side
        const goRight = index % 2 === 0 ? 
          existingRightBranches <= existingLeftBranches : 
          existingRightBranches > existingLeftBranches;
          
        const xDirection = goRight ? 1 : -1;
        const xOffset = HORIZONTAL_SPACING * xDirection;
        
        // Calculate Y position with proper spacing
        const yPosition = startY + (index * VERTICAL_SPACING);
        
        positions[childId] = {
          x: parentPos.x + xOffset,
          y: yPosition
        };
        
        // Recursively position children of this branch
        positionBranch(childId, depth + 1);
      });
    };
    
    // Start positioning from root
    positionBranch(rootBranch.id);
    
    // Post-process to fix overlaps
    return resolveOverlaps(positions);
  };
  
  // Function to resolve overlapping positions
  const resolveOverlaps = (positions: Record<string, { x: number; y: number }>): Record<string, { x: number; y: number }> => {
    const BLOCK_WIDTH = 320;
    const BLOCK_HEIGHT = 380;
    const MIN_SPACING = 50;
    
    const positionArray = Object.entries(positions);
    const resolved = { ...positions };
    
    // Check for overlaps and resolve them
    for (let i = 0; i < positionArray.length; i++) {
      for (let j = i + 1; j < positionArray.length; j++) {
        const [id1, pos1] = positionArray[i];
        const [id2, pos2] = positionArray[j];
        
        const dx = Math.abs(pos1.x - pos2.x);
        const dy = Math.abs(pos1.y - pos2.y);
        
        // Check if blocks overlap
        if (dx < BLOCK_WIDTH + MIN_SPACING && dy < BLOCK_HEIGHT + MIN_SPACING) {
          // Move the second block to resolve overlap
          const moveDistance = BLOCK_HEIGHT + MIN_SPACING;
          
          if (pos2.y >= pos1.y) {
            resolved[id2] = {
              ...pos2,
              y: pos1.y + moveDistance
            };
          } else {
            resolved[id2] = {
              ...pos2,
              y: pos1.y - moveDistance
            };
          }
        }
      }
    }
    
    return resolved;
  };

  const handleNewConversation = () => {
    const newId = Date.now().toString();
    const newConversation: Conversation = {
      id: newId,
      title: 'New Conversation',
      lastMessage: 'Start a new conversation',
      activeBranchId: 'main',
      canvasCenter: { x: 800, y: 400 },
      branches: {
        main: {
          id: 'main',
          name: 'main',
          messages: [],
          summary: 'New conversation',
          position: { x: 800, y: 400 },
          level: 0
        }
      }
    };
    setConversations(prev => ({ ...prev, [newId]: newConversation }));
    setActiveConversationId(newId);
    setHighlightedMessageId(undefined);
  };

  const handleSendMessage = (content: string) => {
    if (!activeConversation || !activeBranch) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: `This is a response to: "${content}"`,
      role: 'assistant',
      timestamp: new Date()
    };

    setConversations(prev => ({
      ...prev,
      [activeConversationId]: {
        ...activeConversation,
        lastMessage: content,
        branches: {
          ...activeConversation.branches,
          [activeBranch.id]: {
            ...activeBranch,
            messages: [...activeBranch.messages, userMessage, assistantMessage],
            summary: activeBranch.messages.length === 0 ? 
              `Discussion about: ${content.slice(0, 50)}...` : 
              activeBranch.summary
          }
        }
      }
    }));

    // Clear any message highlighting when sending new messages
    setHighlightedMessageId(undefined);
  };

  const handleCreateBranch = () => {
    if (!activeConversation || !activeBranch || activeBranch.messages.length === 0) return;

    const newBranchId = `branch-${Date.now()}`;
    const lastMessage = activeBranch.messages[activeBranch.messages.length - 1];
    const newLevel = activeBranch.level + 1;
    
    // Create inherited message (greyed out previous message)
    const inheritedMessage: Message = {
      ...lastMessage,
      id: `inherited-${lastMessage.id}`,
      isInherited: true
    };
    
    const newBranch: Branch = {
      id: newBranchId,
      name: newBranchId,
      parentBranchId: activeBranch.id,
      parentMessageId: lastMessage.id,
      messages: [inheritedMessage], // Only include the last message as inherited
      summary: `Branch from: ${activeBranch.summary}`,
      position: { x: 0, y: 0 }, // Will be recalculated
      level: newLevel
    };

    // Create updated conversation with new branch
    const updatedConversation = {
      ...activeConversation,
      activeBranchId: newBranchId,
      branches: {
        ...activeConversation.branches,
        [newBranchId]: newBranch
      }
    };

    // Recalculate all positions with the new branch
    const newPositions = calculateOptimalBranchPositions(updatedConversation);
    
    // Update all branch positions
    const updatedBranches: Record<string, Branch> = {};
    Object.entries(updatedConversation.branches).forEach(([id, branch]) => {
      updatedBranches[id] = {
        ...branch,
        position: newPositions[id] || branch.position
      };
    });

    setConversations(prev => ({
      ...prev,
      [activeConversationId]: {
        ...updatedConversation,
        branches: updatedBranches
      }
    }));

    // Clear any message highlighting when creating new branches
    setHighlightedMessageId(undefined);
  };

  const handleSwitchBranch = (branchId: string) => {
    if (!activeConversation) return;

    setConversations(prev => ({
      ...prev,
      [activeConversationId]: {
        ...activeConversation,
        activeBranchId: branchId
      }
    }));

    // Clear message highlighting when switching branches (unless it's the target branch)
    const targetBranch = activeConversation.branches[branchId];
    if (targetBranch && highlightedMessageId) {
      // Check if the highlighted message exists in the target branch
      const messageExists = targetBranch.messages.some(m => m.id === highlightedMessageId);
      if (!messageExists) {
        setHighlightedMessageId(undefined);
      }
    }
  };

  const handleNavigateToMessage = (branchId: string, messageId: string) => {
    if (!activeConversation) return;

    // Switch to the target branch
    setConversations(prev => ({
      ...prev,
      [activeConversationId]: {
        ...activeConversation,
        activeBranchId: branchId
      }
    }));

    // Highlight the target message
    setHighlightedMessageId(messageId);

    // Clear the highlight after a few seconds
    setTimeout(() => {
      setHighlightedMessageId(undefined);
    }, 3000);
  };

  const conversationList = Object.values(conversations).map(conv => ({
    id: conv.id,
    title: conv.title,
    lastMessage: conv.lastMessage
  }));

  return (
    <div className="h-screen bg-background flex">
      {/* Left Sidebar */}
      <ConversationSidebar
        conversations={conversationList}
        activeConversationId={activeConversationId}
        onConversationSelect={(id) => {
          setActiveConversationId(id);
          setHighlightedMessageId(undefined);
        }}
        onNewConversation={handleNewConversation}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Area */}
        <CanvasArea 
          ref={canvasRef}
          conversation={activeConversation}
          onSwitchBranch={handleSwitchBranch}
          onNavigateToMessage={handleNavigateToMessage}
          highlightedMessageId={highlightedMessageId}
        />
        
        {/* Chat Bar */}
        <ChatBar
          selectedTool={selectedTool}
          selectedModel={selectedModel}
          onToolChange={setSelectedTool}
          onModelChange={setSelectedModel}
          onSendMessage={handleSendMessage}
          onCreateBranch={handleCreateBranch}
          activeBranch={activeBranch}
          availableBranches={activeConversation ? Object.values(activeConversation.branches) : []}
          onSwitchBranch={handleSwitchBranch}
        />
      </div>
    </div>
  );
}