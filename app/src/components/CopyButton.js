import React from 'react';
import toast from 'react-hot-toast';

const CopyButton = ({ text, className = '' }) => {
  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied Successfully');
    } catch (error) {
      console.error('Copy Failed', error);
      toast.error('Copy Failed');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`btn btn-success btn-sm ${className}`}
      style={{
        padding: '5px 12px',
        fontSize: '12px',
        borderRadius: '6px',
        fontWeight: '600',
        cursor: 'pointer'
      }}
    >
      Copy
    </button>
  );
};

export default CopyButton;
