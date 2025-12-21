import React, { useEffect, useRef, useState } from 'react';
import { Empty, Spin } from 'antd';
import { renderAsync } from 'docx-preview';
import { templateService } from '../../../services/templateService';

interface TemplateDetailProps {
  templateId?: string;
}

export const TemplateDetail: React.FC<TemplateDetailProps> = ({ templateId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!templateId || !containerRef.current) return;

    const loadDoc = async () => {
      try {
        setLoading(true);
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }

        const blob = await templateService.getFile(templateId);

        // Handle PDF
        if (blob.type === 'application/pdf') {
            const url = URL.createObjectURL(blob);
            if (containerRef.current) {
                const iframe = document.createElement('iframe');
                iframe.src = url;
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                containerRef.current.appendChild(iframe);
            }
            return;
        }

        // Handle DOCX
        if (containerRef.current) {
            await renderAsync(blob, containerRef.current, undefined, {
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
                ignoreFonts: false,
                breakPages: true,
                ignoreLastRenderedPageBreak: true,
                experimental: false,
                trimXmlDeclaration: true,
                useBase64URL: false,
                renderChanges: false,
                debug: false,
            });
        }
      } catch (error) {
        console.error('Failed to load template:', error);
        if (containerRef.current) {
            containerRef.current.innerHTML = '<div style="padding: 20px; color: red;">加载失败，请重试</div>';
        }
      } finally {
        setLoading(false);
      }
    };

    loadDoc();
  }, [templateId]);

  if (!templateId) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <Empty description="请选择左侧模板查看详情" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', paddingTop: 64, boxSizing: 'border-box' }}>
      {/* Left: Original Template (Preview) */}
      <div style={{ flex: 1, borderRight: '1px solid #f0f0f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', fontWeight: 500 }}>
          原始模板预览
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#f5f5f5' }}>
            {loading && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)' }}>
                    <Spin tip="加载文档中..." />
                </div>
            )}
            <div
              ref={containerRef}
              style={{ height: '100%', overflowY: 'auto' }}
            />
        </div>
      </div>


      {/* Right: AI Annotation Result (Placeholder) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
         <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', fontWeight: 500 }}>
          AI 标注结果
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
          <Empty description="AI 标注结果待生成" />
        </div>
      </div>
    </div>
  );
};
