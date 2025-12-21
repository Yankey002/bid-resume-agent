import React from 'react';
import { Layout } from 'antd';

const { Sider, Content } = Layout;

interface MasterDetailLayoutProps {
  sidebarContent: React.ReactNode;
  mainContent: React.ReactNode;
  isSidebarOpen?: boolean;
  sidebarWidth?: number;
  collapsedWidth?: number;
}

export const MasterDetailLayout: React.FC<MasterDetailLayoutProps> = ({
  sidebarContent,
  mainContent,
  isSidebarOpen = true,
  sidebarWidth = 300,
  collapsedWidth = 60,
}) => {
  // If isSidebarOpen is true, width = sidebarWidth.
  // If isSidebarOpen is false, width = collapsedWidth.
  const width = isSidebarOpen ? sidebarWidth : collapsedWidth;
  const collapsed = !isSidebarOpen;

  return (
    <Layout style={{ height: '100%', background: '#fff' }}>
      <Sider
        width={width}
        theme="light"
        style={{
          borderRight: '1px solid #f0f0f0',
          transition: 'all 0.3s ease',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        <div style={{
          width: sidebarWidth, // Force inner content to stay full width so it doesn't wrap weirdly during transition
          height: '100%',
          opacity: 1,
          transition: 'opacity 0.3s'
        }}>
           {/* Pass collapsed state to children if needed */}
           {React.isValidElement<{ collapsed?: boolean }>(sidebarContent)
              ? React.cloneElement(sidebarContent, { collapsed })
              : sidebarContent}
        </div>
      </Sider>
      <Content style={{
        overflow: 'hidden',
        position: 'relative',
        height: '100%'
      }}>
        {mainContent}
      </Content>
    </Layout>
  );
};
