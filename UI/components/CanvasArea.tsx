import { forwardRef, useEffect, useRef, useState, useCallback } from 'react';
import { ConversationBlock } from './ConversationBlock';

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

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  branches: Record<string, Branch>;
  activeBranchId: string;
  canvasCenter: { x: number; y: number };
}

interface CanvasAreaProps {
  conversation?: Conversation;
  onSwitchBranch: (branchId: string) => void;
  onNavigateToMessage?: (branchId: string, messageId: string) => void;
  highlightedMessageId?: string;
}

export const CanvasArea = forwardRef<HTMLDivElement, CanvasAreaProps>(({ 
  conversation, 
  onSwitchBranch,
  onNavigateToMessage,
  highlightedMessageId
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });

  // Center the view on the main branch when conversation changes
  useEffect(() => {
    if (conversation && canvasRef.current) {
      const container = canvasRef.current;
      const mainBranch = conversation.branches.main;
      
      if (mainBranch) {
        // Calculate offset to center the main branch
        const centerX = container.clientWidth / 2 - mainBranch.position.x;
        const centerY = container.clientHeight / 2 - mainBranch.position.y;
        
        setCanvasOffset({ x: centerX, y: centerY });
      }
    }
  }, [conversation?.id]);

  // Check if the element or its parents are within a scrollable area of a conversation block
  const isWithinScrollableArea = useCallback((element: EventTarget | null): boolean => {
    if (!element || !(element instanceof Element)) return false;
    
    let current: Element | null = element;
    while (current) {
      // Check for scroll area container
      if (current.hasAttribute('data-radix-scroll-area-viewport') || 
          current.classList.contains('scroll-area-viewport') ||
          current.querySelector('[data-radix-scroll-area-viewport]')) {
        return true;
      }
      
      // Check for conversation block container
      if (current.classList.contains('conversation-block-content')) {
        return true;
      }
      
      current = current.parentElement;
    }
    
    return false;
  }, []);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Trackpad/wheel handler for panning
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Check if this is a pinch gesture
    const isPinch = e.ctrlKey || e.metaKey;
    
    if (isPinch) {
      return; // Allow default pinch behavior
    }

    // Check if the scroll is happening within a conversation block's scrollable area
    if (isWithinScrollableArea(e.target)) {
      return; // Allow scrolling within conversation blocks
    }
    
    // Otherwise, handle canvas panning
    e.preventDefault();
    
    // Apply a multiplier for smoother panning
    const sensitivity = 1;
    setCanvasOffset(prev => ({
      x: prev.x - e.deltaX * sensitivity,
      y: prev.y - e.deltaY * sensitivity
    }));
  }, [isWithinScrollableArea]);

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate connection points for arrows
  const calculateConnectionPoints = (parentBranch: Branch, childBranch: Branch) => {
    const BLOCK_WIDTH = 160; // Half of the actual block width for edge calculation
    
    // Determine which side to connect from/to
    const isChildOnRight = childBranch.position.x > parentBranch.position.x;
    const isChildOnLeft = childBranch.position.x < parentBranch.position.x;
    
    let startX = parentBranch.position.x;
    let endX = childBranch.position.x;
    
    if (isChildOnRight) {
      startX = parentBranch.position.x + BLOCK_WIDTH; // Right edge of parent
      endX = childBranch.position.x - BLOCK_WIDTH; // Left edge of child
    } else if (isChildOnLeft) {
      startX = parentBranch.position.x - BLOCK_WIDTH; // Left edge of parent
      endX = childBranch.position.x + BLOCK_WIDTH; // Right edge of child
    }
    
    return {
      startX,
      startY: parentBranch.position.y,
      endX,
      endY: childBranch.position.y
    };
  };

  if (!conversation) {
    return (
      <div className="flex-1 relative overflow-hidden" ref={ref}>
        {/* Grid Background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
        
        {/* Canvas Content */}
        <div className="relative h-full p-4">
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-xl mb-2">Canvas Area</div>
              <div className="text-sm">Start a conversation to begin working</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const branches = Object.values(conversation.branches);
  const hasBranches = branches.some(branch => branch.messages.length > 0);

  return (
    <div className="flex-1 relative overflow-hidden" ref={ref}>
      {/* Canvas Viewport */}
      <div 
        ref={canvasRef}
        className={`h-full w-full relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        style={{ 
          userSelect: 'none',
          touchAction: 'none' // Prevent default touch behaviors
        }}
      >
        {/* Canvas Content Container */}
        <div 
          className="absolute"
          style={{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
            width: '100%',
            height: '100%'
          }}
        >
          {/* Grid Background */}
          <div 
            className="absolute opacity-30 pointer-events-none"
            style={{
              left: -Math.abs(canvasOffset.x) - 1000,
              top: -Math.abs(canvasOffset.y) - 1000,
              width: `calc(100vw + ${Math.abs(canvasOffset.x) * 2 + 2000}px)`,
              height: `calc(100vh + ${Math.abs(canvasOffset.y) * 2 + 2000}px)`,
              backgroundImage: `
                linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: `${canvasOffset.x % 20}px ${canvasOffset.y % 20}px`
            }}
          />

          {!hasBranches ? (
            <div 
              className="absolute flex items-center justify-center text-muted-foreground pointer-events-none"
              style={{
                left: conversation.canvasCenter.x - 100,
                top: conversation.canvasCenter.y - 50,
                width: 200,
                height: 100
              }}
            >
              <div className="text-center">
                <div className="text-xl mb-2">Ready to Chat</div>
                <div className="text-sm">Send your first message to start</div>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation Blocks */}
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="absolute pointer-events-auto"
                  style={{
                    left: branch.position.x,
                    top: branch.position.y,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}
                  onMouseDown={(e) => e.stopPropagation()} // Prevent canvas dragging when clicking on blocks
                >
                  <ConversationBlock
                    branch={branch}
                    isActive={conversation.activeBranchId === branch.id}
                    onSelect={() => onSwitchBranch(branch.id)}
                    showConnection={!!branch.parentBranchId}
                    onNavigateToMessage={onNavigateToMessage}
                    highlightedMessageId={highlightedMessageId}
                  />
                </div>
              ))}

              {/* Branch Connection Lines - Enhanced positioning */}
              {branches.map((branch) => {
                if (!branch.parentBranchId) return null;
                
                const parentBranch = conversation.branches[branch.parentBranchId];
                if (!parentBranch) return null;

                const { startX, startY, endX, endY } = calculateConnectionPoints(parentBranch, branch);

                // Calculate control points for smooth curves
                const deltaX = Math.abs(endX - startX);
                const deltaY = Math.abs(endY - startY);
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // Dynamic control offset based on distance
                const controlOffset = Math.min(Math.max(deltaX * 0.3, 80), 150);
                
                const isChildOnRight = endX > startX;
                const controlX1 = startX + (isChildOnRight ? controlOffset : -controlOffset);
                const controlX2 = endX + (isChildOnRight ? -controlOffset : controlOffset);

                // Create bounding box for the arrow SVG
                const minX = Math.min(startX, endX) - 50;
                const maxX = Math.max(startX, endX) + 50;
                const minY = Math.min(startY, endY) - 50;
                const maxY = Math.max(startY, endY) + 50;

                return (
                  <div
                    key={`connection-${branch.id}`}
                    className="absolute pointer-events-none"
                    style={{
                      left: minX,
                      top: minY,
                      width: maxX - minX,
                      height: maxY - minY,
                      zIndex: 5 // Below conversation blocks but above background
                    }}
                  >
                    <svg
                      width="100%"
                      height="100%"
                      className="overflow-visible"
                    >
                      <defs>
                        <marker
                          id={`arrow-${branch.id}`}
                          markerWidth="8"
                          markerHeight="6"
                          refX="7"
                          refY="3"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <polygon
                            points="0,0 8,3 0,6"
                            fill="#64748b"
                          />
                        </marker>
                      </defs>
                      
                      {/* Main connection curve */}
                      <path
                        d={`M ${startX - minX} ${startY - minY} 
                           C ${controlX1 - minX} ${startY - minY}, 
                             ${controlX2 - minX} ${endY - minY}, 
                             ${endX - minX} ${endY - minY}`}
                        stroke="#64748b"
                        strokeWidth="2"
                        strokeDasharray="8,4"
                        fill="none"
                        opacity="0.7"
                        markerEnd={`url(#arrow-${branch.id})`}
                      />
                      
                      {/* Connection indicators */}
                      <circle
                        cx={startX - minX}
                        cy={startY - minY}
                        r="4"
                        fill="#94a3b8"
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                      <circle
                        cx={endX - minX}
                        cy={endY - minY}
                        r="3"
                        fill="#64748b"
                      />
                      
                      {/* Branch level indicator */}
                      <text
                        x={startX - minX + (endX - startX) / 2}
                        y={startY - minY + (endY - startY) / 2 - 10}
                        textAnchor="middle"
                        className="text-xs fill-slate-400"
                        fontSize="10"
                      >
                        L{branch.level}
                      </text>
                    </svg>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

CanvasArea.displayName = 'CanvasArea';