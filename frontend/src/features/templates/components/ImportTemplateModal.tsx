import React, { useState, useRef } from 'react';
import { Modal, Upload, Button, Progress, Typography, message, Space, Alert } from 'antd';
import { InboxOutlined, PauseCircleOutlined, PlayCircleOutlined, DeleteOutlined, CloudUploadOutlined } from '@ant-design/icons';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import { templateService } from '../../../services/templateService';

const { Dragger } = Upload;
const { Text } = Typography;

interface ImportTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FileItem extends UploadFile {
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error' | 'paused';
  originFileObj?: RcFile;
}

export const ImportTemplateModal: React.FC<ImportTemplateModalProps> = ({ open, onClose, onSuccess }) => {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle file selection
  const handleBeforeUpload = (file: RcFile) => {
    // Simple validation
    const isLt20M = file.size ? file.size / 1024 / 1024 < 20 : true;
    if (!isLt20M) {
      message.error(`${file.name} 超过 20MB限制`);
      return Upload.LIST_IGNORE;
    }

    const newItem: FileItem = {
      uid: file.uid,
      name: file.name,
      status: 'done',
      size: file.size,
      type: file.type,
      originFileObj: file,
      uploadStatus: 'pending',
    };

    setFileList((prev) => [...prev, newItem]);
    return false; // Prevent auto upload
  };

  const handleRemove = (file: UploadFile) => {
    if (uploading && !paused) {
      message.warning('请先暂停上传后再移除文件');
      return;
    }
    setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
  };

  // Single file upload logic
  const uploadSingleFile = async (fileItem: FileItem) => {
    if (fileItem.uploadStatus === 'success') return;

    // Update status to uploading
    setFileList(prev => prev.map(f => f.uid === fileItem.uid ? { ...f, uploadStatus: 'uploading', percent: 0 } : f));

    try {
      const realFile = fileItem.originFileObj || fileItem as unknown as File;

      await templateService.upload(
        realFile,
        (percent) => {
          setFileList(prev => prev.map(f => f.uid === fileItem.uid ? { ...f, percent } : f));
        }
      );

      setFileList(prev => prev.map(f => f.uid === fileItem.uid ? { ...f, uploadStatus: 'success', percent: 100 } : f));
    } catch (error) {
      console.error(error);
      setFileList(prev => prev.map(f => f.uid === fileItem.uid ? { ...f, uploadStatus: 'error' } : f));
    }
  };

  const processUploads = async () => {
    setUploading(true);
    setPaused(false);

    for (let i = 0; i < fileList.length; i++) {
       if (pausedRef.current) {
         break;
       }

       const file = fileList[i];
       if (file.uploadStatus === 'pending' || file.uploadStatus === 'error') {
         await uploadSingleFile(file);
       }
    }

    setUploading(false);
    if (!pausedRef.current) {
       // All done
       const hasError = fileList.some(f => f.uploadStatus === 'error');
       if (!hasError) {
         message.success('所有文件处理完毕');
         onSuccess?.();
         window.dispatchEvent(new Event('templates:refresh')); // Trigger global refresh
       } else {
         message.warning('部分文件上传失败');
       }
    }
  };

  const pausedRef = useRef(false);
  const togglePause = () => {
    if (paused) {
      // Resume
      setPaused(false);
      pausedRef.current = false;
      processUploads();
    } else {
      // Pause
      setPaused(true);
      pausedRef.current = true;
      setUploading(false);
    }
  };

  const handleStart = () => {
    pausedRef.current = false;
    processUploads();
  };

  const handleCancel = () => {
    setPaused(true);
    pausedRef.current = true;
    setUploading(false);
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    onClose();
  };

  const clearList = () => {
      if (uploading) return;
      setFileList([]);
  };

  return (
    <Modal
      title="导入模板"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={700}
      maskClosable={!uploading}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="large">

        {/* Selection Area */}
        <Dragger
          fileList={[]}
          beforeUpload={handleBeforeUpload}
          multiple
          showUploadList={false}
          disabled={uploading && !paused}
          style={{ padding: '20px' }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域</p>
          <p className="ant-upload-hint">支持 .docx, .pdf 格式，单文件不超过 20MB</p>
        </Dragger>

        {/* Stats */}
        {fileList.length > 0 && (
          <Alert
            message={`已选择 ${fileList.length} 个文件`}
            type="info"
            action={
               !uploading && <Button size="small" type="link" onClick={clearList} danger>清空</Button>
            }
          />
        )}

        {/* File List */}
        {fileList.length > 0 && (
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
            {fileList.map((item) => (
                <div
                    key={item.uid}
                    style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ flex: 1, marginRight: 12 }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text ellipsis style={{ maxWidth: 300 }}>{item.name}</Text>
                            <Space>
                                {item.uploadStatus === 'error' && <Text type="danger">上传失败</Text>}
                                {item.uploadStatus === 'success' && <Text type="success">上传成功</Text>}
                                {item.uploadStatus === 'uploading' && <Text type="secondary">{Math.round(item.percent || 0)}%</Text>}
                            </Space>
                         </div>
                         <Progress percent={item.percent} size="small" status={item.uploadStatus === 'error' ? 'exception' : (item.uploadStatus === 'success' ? 'success' : 'active')} />
                    </div>
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemove(item)}
                        disabled={uploading && !paused}
                    />
                </div>
            ))}
          </div>
        )}

        {/* Control Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
           <Button onClick={handleCancel}>关闭</Button>

           {uploading ? (
             <Button icon={<PauseCircleOutlined />} onClick={togglePause}>暂停</Button>
           ) : (
             <Button
               type="primary"
               icon={paused ? <PlayCircleOutlined /> : <CloudUploadOutlined />}
               onClick={handleStart}
               disabled={fileList.length === 0 || fileList.every(f => f.uploadStatus === 'success')}
             >
               {paused ? '继续导入' : '开始导入'}
             </Button>
           )}
        </div>
      </Space>
    </Modal>
  );
};
