import { useState, useCallback } from 'react';
import AiAssist from './AiAssist';
import CallLogForm from './CallLogForm';

export default function CallMode({ tree, addCallLog, addAiObjection, apiKey, saveTreeVersion }) {
  const [currentNodeId, setCurrentNodeId] = useState('choose_opener');
  const [path, setPath] = useState(['choose_opener']);
  const [showLogger, setShowLogger] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  const node = tree[currentNodeId];

  const navigateTo = useCallback((targetId) => {
    const targetNode = tree[targetId];
    setCurrentNodeId(targetId);
    setPath(prev => [...prev, targetId]);
    setAiResponse(null);
    if (targetNode?.endState) {
      setShowLogger(true);
    }
  }, [tree]);

  const goBack = useCallback(() => {
    if (path.length > 1) {
      const newPath = path.slice(0, -1);
      setPath(newPath);
      setCurrentNodeId(newPath[newPath.length - 1]);
      setAiResponse(null);
    }
  }, [path]);

  const startOver = useCallback(() => {
    if (path.length > 1 && !showLogger) {
      setShowLogger(true);
    } else {
      setCurrentNodeId('choose_opener');
      setPath(['choose_opener']);
      setAiResponse(null);
      setShowLogger(false);
    }
  }, [path, showLogger]);

  const handleLogSubmit = useCallback((log) => {
    addCallLog({
      ...log,
      id: crypto.randomUUID(),
      path: [...path],
      timestamp: Date.now(),
    });
    setCurrentNodeId('choose_opener');
    setPath(['choose_opener']);
    setShowLogger(false);
    setAiResponse(null);
  }, [addCallLog, path]);

  const handleLogSkip = useCallback(() => {
    setCurrentNodeId('choose_opener');
    setPath(['choose_opener']);
    setShowLogger(false);
    setAiResponse(null);
  }, []);

  const endTypeColor = node?.endType === 'success'
    ? '#16a34a'
    : node?.endType === 'neutral'
      ? '#2563eb'
      : '#6b7280';

  if (showLogger) {
    return (
      <div className="call-container">
        <CallLogForm
          path={path}
          tree={tree}
          endType={node?.endType}
          onSubmit={handleLogSubmit}
          onSkip={handleLogSkip}
        />
      </div>
    );
  }

  return (
    <div className="call-container">
      {path.length > 1 && (
        <div className="breadcrumb">
          {path.map((nodeId, i) => (
            <span key={i}>
              {i > 0 && <span className="breadcrumb-sep"> › </span>}
              <span className={i === path.length - 1 ? 'breadcrumb-current' : 'breadcrumb-past'}>
                {tree[nodeId]?.label || nodeId}
              </span>
            </span>
          ))}
        </div>
      )}

      {path.length > 1 && (
        <div className="call-nav">
          <button className="back-btn" onClick={goBack}>← Back</button>
          <button className="restart-btn" onClick={startOver}>Start over</button>
        </div>
      )}

      {node?.isOpenerChoice ? (
        <>
          <div className="opener-choice-header">{node.scriptText}</div>
          <div className="opener-choice-grid">
            {node.options.map((opt, i) => {
              const targetNode = tree[opt.targetNodeId];
              return (
                <button
                  key={i}
                  className="opener-choice-card"
                  onClick={() => navigateTo(opt.targetNodeId)}
                >
                  <span className="opener-choice-label">{opt.buttonLabel}</span>
                  {targetNode && (
                    <span className="opener-choice-preview">{targetNode.scriptText}</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="script-card" style={node?.endState ? { borderLeft: `4px solid ${endTypeColor}` } : {}}>
            {node?.endState && (
              <div className="end-badge" style={{ background: endTypeColor }}>
                {node.endType === 'success' ? '✓ Success' : node.endType === 'neutral' ? '→ Follow up' : '— End'}
              </div>
            )}
            <p className="script-text">{node?.scriptText}</p>
          </div>

          {aiResponse && (
            <div className="ai-response-card">
              <div className="ai-response-label">AI Suggested Response</div>
              <p className="script-text">{aiResponse.text}</p>
              <div className="ai-response-actions">
                <button
                  className="save-to-script-btn"
                  onClick={() => {
                    const newNodeId = crypto.randomUUID();
                    const newNode = {
                      id: newNodeId,
                      label: aiResponse.objection,
                      scriptText: aiResponse.text,
                      options: [],
                    };
                    const updatedTree = {
                      ...tree,
                      [newNodeId]: newNode,
                      [currentNodeId]: {
                        ...tree[currentNodeId],
                        options: [
                          ...tree[currentNodeId].options,
                          { buttonLabel: aiResponse.objection, targetNodeId: newNodeId },
                        ],
                      },
                    };
                    saveTreeVersion(updatedTree, `Added AI response: "${aiResponse.objection.slice(0, 40)}"`);
                    setAiResponse(null);
                  }}
                >
                  Save this to the script
                </button>
                <button className="discard-btn" onClick={() => setAiResponse(null)}>Discard</button>
              </div>
            </div>
          )}

          {!node?.endState && node?.options && (
            <div className="options-list">
              {node.options.map((opt, i) => (
                <button
                  key={i}
                  className="option-btn"
                  onClick={() => navigateTo(opt.targetNodeId)}
                >
                  {opt.buttonLabel}
                </button>
              ))}

              <AiAssist
                tree={tree}
                path={path}
                currentNode={node}
                apiKey={apiKey}
                addAiObjection={addAiObjection}
                onResponse={(resp) => setAiResponse(resp)}
              />
            </div>
          )}
        </>
      )}

      {node?.endState && (
        <div className="end-actions">
          <button className="option-btn restart-btn" onClick={startOver}>Start over</button>
        </div>
      )}
    </div>
  );
}
