import React from 'react';
import { CopilotWidget } from '../components/copilot/CopilotWidget';

export const AICopilotPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <CopilotWidget isFloating={false} />
    </div>
  );
};
