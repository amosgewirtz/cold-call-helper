import { useState } from 'react';

export default function EditMode({ tree, saveTreeVersion, setMode }) {
  const [selectedNodeId, setSelectedNodeId] = useState('choose_opener');
  const [editingNode, setEditingNode] = useState(null);
  const [addingOption, setAddingOption] = useState(false);
  const [newOption, setNewOption] = useState({ buttonLabel: '', scriptText: '', target: 'new_end', existingTarget: '', endType: 'end' });
  const [previewMode, setPreviewMode] = useState(false);
  const [previewNodeId, setPreviewNodeId] = useState('choose_opener');
  const [previewPath, setPreviewPath] = useState(['choose_opener']);

  const node = tree[selectedNodeId];
  const nodeIds = Object.keys(tree);

  const startEdit = () => {
    setEditingNode({ ...node, options: node.options.map(o => ({ ...o })) });
  };

  const saveEdit = () => {
    if (!editingNode) return;
    const updatedTree = { ...tree, [editingNode.id]: editingNode };
    saveTreeVersion(updatedTree, `Edited: ${editingNode.label}`);
    setEditingNode(null);
  };

  const deleteOption = (index) => {
    if (!confirm('Delete this response branch?')) return;
    const updatedOptions = node.options.filter((_, i) => i !== index);
    const updatedTree = { ...tree, [selectedNodeId]: { ...node, options: updatedOptions } };
    saveTreeVersion(updatedTree, `Deleted option from: ${node.label}`);
  };

  const moveOption = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= node.options.length) return;
    const options = [...node.options];
    [options[index], options[newIndex]] = [options[newIndex], options[index]];
    const updatedTree = { ...tree, [selectedNodeId]: { ...node, options } };
    saveTreeVersion(updatedTree, `Reordered options in: ${node.label}`);
  };

  const addNewOption = () => {
    if (!newOption.buttonLabel.trim()) return;

    let targetNodeId;
    const updatedTree = { ...tree };

    if (newOption.target === 'existing') {
      targetNodeId = newOption.existingTarget;
    } else if (newOption.target === 'new_end') {
      targetNodeId = crypto.randomUUID();
      updatedTree[targetNodeId] = {
        id: targetNodeId,
        label: newOption.buttonLabel,
        scriptText: newOption.scriptText || 'End of branch.',
        endState: true,
        endType: newOption.endType,
        options: [],
      };
    } else {
      targetNodeId = crypto.randomUUID();
      updatedTree[targetNodeId] = {
        id: targetNodeId,
        label: newOption.buttonLabel,
        scriptText: newOption.scriptText || '',
        options: [],
      };
    }

    updatedTree[selectedNodeId] = {
      ...tree[selectedNodeId],
      options: [...tree[selectedNodeId].options, { buttonLabel: newOption.buttonLabel, targetNodeId }],
    };

    saveTreeVersion(updatedTree, `Added option: "${newOption.buttonLabel}" to ${node.label}`);
    setAddingOption(false);
    setNewOption({ buttonLabel: '', scriptText: '', target: 'new_end', existingTarget: '', endType: 'end' });
  };

  if (previewMode) {
    const pNode = tree[previewNodeId];
    return (
      <div className="edit-preview">
        <div className="preview-bar">
          <span>Preview mode</span>
          <button onClick={() => { setPreviewMode(false); setPreviewNodeId('choose_opener'); setPreviewPath(['choose_opener']); }}>
            Exit preview
          </button>
        </div>
        <div className="call-container">
          {previewPath.length > 1 && (
            <div className="breadcrumb">
              {previewPath.map((nid, i) => (
                <span key={i}>
                  {i > 0 && <span className="breadcrumb-sep"> › </span>}
                  <span className={i === previewPath.length - 1 ? 'breadcrumb-current' : 'breadcrumb-past'}>
                    {tree[nid]?.label || nid}
                  </span>
                </span>
              ))}
            </div>
          )}
          <div className="script-card">
            <p className="script-text">{pNode?.scriptText}</p>
          </div>
          {!pNode?.endState && pNode?.options?.map((opt, i) => (
            <button
              key={i}
              className="option-btn"
              onClick={() => {
                setPreviewNodeId(opt.targetNodeId);
                setPreviewPath(p => [...p, opt.targetNodeId]);
              }}
            >
              {opt.buttonLabel}
            </button>
          ))}
          {pNode?.endState && (
            <button className="option-btn restart-btn" onClick={() => { setPreviewNodeId('choose_opener'); setPreviewPath(['choose_opener']); }}>
              Start over
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="edit-container">
      <div className="edit-sidebar">
        <h3 className="edit-sidebar-title">Script Nodes</h3>
        <div className="edit-node-list">
          {nodeIds.map(id => (
            <button
              key={id}
              className={`edit-node-item ${id === selectedNodeId ? 'edit-node-active' : ''} ${tree[id].endState ? 'edit-node-end' : ''}`}
              onClick={() => { setSelectedNodeId(id); setEditingNode(null); setAddingOption(false); }}
            >
              {tree[id].label}
              {tree[id].endState && <span className="end-tag">{tree[id].endType}</span>}
            </button>
          ))}
        </div>
        <button className="preview-btn" onClick={() => setPreviewMode(true)}>
          ▶ Preview call flow
        </button>
      </div>

      <div className="edit-main">
        {editingNode ? (
          <div className="edit-form">
            <h3>Editing: {editingNode.label}</h3>
            <label className="form-label">
              Node label
              <input
                type="text"
                value={editingNode.label}
                onChange={e => setEditingNode({ ...editingNode, label: e.target.value })}
                className="form-input"
              />
            </label>
            <label className="form-label">
              Script text
              <textarea
                value={editingNode.scriptText}
                onChange={e => setEditingNode({ ...editingNode, scriptText: e.target.value })}
                className="form-textarea"
                rows={5}
              />
            </label>
            {editingNode.endState && (
              <label className="form-label">
                End type
                <select
                  value={editingNode.endType || 'end'}
                  onChange={e => setEditingNode({ ...editingNode, endType: e.target.value })}
                  className="form-select"
                >
                  <option value="success">Success (green)</option>
                  <option value="neutral">Neutral / Follow up (blue)</option>
                  <option value="end">End (gray)</option>
                </select>
              </label>
            )}
            <div className="edit-form-actions">
              <button className="save-btn" onClick={saveEdit}>Save changes</button>
              <button className="cancel-btn" onClick={() => setEditingNode(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="node-detail">
            <div className="node-detail-header">
              <h3>{node?.label}</h3>
              <button className="edit-btn" onClick={startEdit}>Edit node</button>
            </div>
            <div className="script-card">
              <p className="script-text">{node?.scriptText}</p>
            </div>

            {node?.options?.length > 0 && (
              <div className="edit-options">
                <h4>Response branches</h4>
                {node.options.map((opt, i) => (
                  <div key={i} className="edit-option-row">
                    <div className="edit-option-label">
                      <span className="option-arrow">→</span>
                      {opt.buttonLabel}
                      <span className="option-target">({tree[opt.targetNodeId]?.label || opt.targetNodeId})</span>
                    </div>
                    <div className="edit-option-actions">
                      <button
                        className="arrow-btn"
                        onClick={() => moveOption(i, -1)}
                        disabled={i === 0}
                        title="Move up"
                      >↑</button>
                      <button
                        className="arrow-btn"
                        onClick={() => moveOption(i, 1)}
                        disabled={i === node.options.length - 1}
                        title="Move down"
                      >↓</button>
                      <button className="delete-opt-btn" onClick={() => deleteOption(i)} title="Delete">✕</button>
                      <button
                        className="goto-btn"
                        onClick={() => { setSelectedNodeId(opt.targetNodeId); setEditingNode(null); }}
                        title="Go to node"
                      >→</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!node?.endState && (
              <>
                {addingOption ? (
                  <div className="add-option-form">
                    <h4>Add new response</h4>
                    <label className="form-label">
                      Button label (what the prospect says)
                      <input
                        type="text"
                        value={newOption.buttonLabel}
                        onChange={e => setNewOption({ ...newOption, buttonLabel: e.target.value })}
                        className="form-input"
                        autoFocus
                      />
                    </label>
                    <label className="form-label">
                      Where does it lead?
                      <select
                        value={newOption.target}
                        onChange={e => setNewOption({ ...newOption, target: e.target.value })}
                        className="form-select"
                      >
                        <option value="new_end">New end state</option>
                        <option value="new_node">New intermediate node</option>
                        <option value="existing">Existing node</option>
                      </select>
                    </label>
                    {newOption.target === 'existing' && (
                      <label className="form-label">
                        Target node
                        <select
                          value={newOption.existingTarget}
                          onChange={e => setNewOption({ ...newOption, existingTarget: e.target.value })}
                          className="form-select"
                        >
                          <option value="">Select a node...</option>
                          {nodeIds.map(id => (
                            <option key={id} value={id}>{tree[id].label}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {newOption.target !== 'existing' && (
                      <label className="form-label">
                        Script text (what the SDR says)
                        <textarea
                          value={newOption.scriptText}
                          onChange={e => setNewOption({ ...newOption, scriptText: e.target.value })}
                          className="form-textarea"
                          rows={3}
                        />
                      </label>
                    )}
                    {newOption.target === 'new_end' && (
                      <label className="form-label">
                        End type
                        <select
                          value={newOption.endType}
                          onChange={e => setNewOption({ ...newOption, endType: e.target.value })}
                          className="form-select"
                        >
                          <option value="success">Success</option>
                          <option value="neutral">Neutral / Follow up</option>
                          <option value="end">End</option>
                        </select>
                      </label>
                    )}
                    <div className="edit-form-actions">
                      <button className="save-btn" onClick={addNewOption} disabled={!newOption.buttonLabel.trim() || (newOption.target === 'existing' && !newOption.existingTarget)}>
                        Add response
                      </button>
                      <button className="cancel-btn" onClick={() => setAddingOption(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="add-option-btn" onClick={() => setAddingOption(true)}>
                    + Add response
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
