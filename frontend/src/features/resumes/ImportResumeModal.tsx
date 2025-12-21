import React, { useState, useRef } from 'react';
import { Modal, Upload, Button, List, Progress, Typography, message, Space, Alert, Input, Spin, Radio } from 'antd';
import { InboxOutlined, PauseCircleOutlined, PlayCircleOutlined, DeleteOutlined, CloudUploadOutlined, UserOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import { candidateService } from '../../services/candidateService';
import { resumeService } from '../../services/resumeService';
import type { Candidate } from '../../types';
import api from '../../services/api';

const { Dragger } = Upload;
const { Text } = Typography;

interface ImportResumeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FileItem extends UploadFile {
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error' | 'paused';
  candidateName?: string;
  extracting?: boolean;
  // New fields
  matchedCandidates?: Candidate[];
  selectedCandidateId?: string; // 'new' or UUID
  suggestedId?: string; // Auto-generated ID for new candidate
  isSearchingCandidates?: boolean;
  originFileObj?: RcFile; // Explicitly define this
}

export const ImportResumeModal: React.FC<ImportResumeModalProps> = ({ open, onClose, onSuccess }) => {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSuggestedIdRef = useRef<number>(0);

  // Reset ID tracker when modal opens
  React.useEffect(() => {
    if (open) {
      lastSuggestedIdRef.current = 0;
    }
  }, [open]);

  const getSmartSuggestedId = async () => {
      try {
          const idStr = await candidateService.suggestId();
          const idNum = parseInt(idStr, 10);

          // Ensure strictly increasing IDs locally to avoid collisions in UI
          let nextId = idNum;
          if (lastSuggestedIdRef.current > 0 && nextId <= lastSuggestedIdRef.current) {
              nextId = lastSuggestedIdRef.current + 1;
          }

          lastSuggestedIdRef.current = nextId;
          return String(nextId).padStart(6, '0');
      } catch (e) {
          // Fallback
          const nextId = (lastSuggestedIdRef.current || 0) + 1;
          lastSuggestedIdRef.current = nextId;
          return String(nextId).padStart(6, '0');
      }
  };

  const extractName = async (file: FileItem) => {
    try {
      const res = await api.post('/llm/extract-name', { filename: file.name });
      const extractedName = res.data.name;

      // Update name and start searching
      setFileList(prev => prev.map(f => f.uid === file.uid ? {
          ...f,
          candidateName: extractedName,
          extracting: false,
          isSearchingCandidates: true
      } : f));

      if (extractedName) {
          try {
              // Fetch search results and ID in parallel, but handle ID smartness
              const [candidates, newId] = await Promise.all([
                  candidateService.search({ name: extractedName }),
                  getSmartSuggestedId()
              ]);

              setFileList(prev => prev.map(f => {
                  if (f.uid !== file.uid) return f;

                  // Auto-select logic:
                  // If 0 matches -> 'new'
                  // If 1 match -> candidates[0].id (Auto-archive)
                  // If > 1 matches -> undefined (Force user selection)
                  let autoSelect: string | undefined = undefined;

                  if (!candidates || candidates.length === 0) {
                      autoSelect = 'new';
                  } else if (candidates.length === 1) {
                      // Explicitly grab the ID and ensure it's a string
                      autoSelect = String(candidates[0].id);
                  }

                  return {
                      ...f,
                      matchedCandidates: candidates,
                      suggestedId: newId,
                      isSearchingCandidates: false,
                      selectedCandidateId: autoSelect
                  };
              }));
          } catch (error) {
              console.error('Search/Suggest failed', error);
              // Fallback if suggest fails?
              setFileList(prev => prev.map(f => f.uid === file.uid ? { ...f, isSearchingCandidates: false, selectedCandidateId: 'new' } : f));
          }
      } else {
           // No name extracted, default to new, maybe fetch ID too?
           try {
               const newId = await getSmartSuggestedId();
               setFileList(prev => prev.map(f => f.uid === file.uid ? { ...f, isSearchingCandidates: false, selectedCandidateId: 'new', suggestedId: newId } : f));
           } catch {
               setFileList(prev => prev.map(f => f.uid === file.uid ? { ...f, isSearchingCandidates: false, selectedCandidateId: 'new' } : f));
           }
      }

    } catch (error) {
      console.error(error);
      setFileList(prev => prev.map(f => f.uid === file.uid ? { ...f, extracting: false, selectedCandidateId: 'new' } : f));
    }
  };

  // 处理文件选择
  const handleBeforeUpload = (file: RcFile) => {
    // 简单校验
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
      originFileObj: file, // 显式保存引用
      uploadStatus: 'pending',
      candidateName: '',
      extracting: true,
      matchedCandidates: [],
      isSearchingCandidates: false
    };

    setFileList((prev) => [...prev, newItem]);

    // 触发姓名提取
    extractName(newItem);

    return false; // 阻止自动上传
  };

  const handleRemove = (file: UploadFile) => {
    if (uploading && !paused) {
      message.warning('请先暂停上传后再移除文件');
      return;
    }
    setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
  };

  // 单个文件上传逻辑
  const uploadSingleFile = async (fileItem: FileItem) => {
    if (fileItem.uploadStatus === 'success') return;

    // Validation
    if (!fileItem.selectedCandidateId) {
        setFileList(prev => prev.map(f => f.uid === fileItem.uid ? { ...f, uploadStatus: 'error' } : f));
        message.error(`请确认 ${fileItem.name} 的候选人身份`);
        return;
    }

    // 更新状态为上传中
    setFileList(prev => prev.map(f => f.uid === fileItem.uid ? { ...f, uploadStatus: 'uploading', percent: 0 } : f));

    let finalCandidateId = fileItem.selectedCandidateId;

    try {
        // Create candidate if needed
        if (finalCandidateId === 'new') {
            const newCandidate = await candidateService.create(fileItem.candidateName || 'Unknown', fileItem.suggestedId);
            finalCandidateId = newCandidate.id;
        }

        const realFile = fileItem.originFileObj || fileItem as unknown as File;

        await resumeService.upload(
            realFile,
            finalCandidateId,
            fileItem.candidateName,
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

  // 这里重写 handleStartUpload 逻辑，使用更直观的方法
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
       // 全部完成
       const hasError = fileList.some(f => f.uploadStatus === 'error');
       if (!hasError) {
         message.success('所有文件处理完毕');
         onSuccess?.();
         window.dispatchEvent(new Event('resumes:refresh')); // Trigger global refresh
       } else {
         message.warning('部分文件上传失败');
       }
    }
  };

  // 使用 Ref 解决闭包问题
  const pausedRef = useRef(false);
  const togglePause = () => {
    if (paused) {
      // Resume
      setPaused(false);
      pausedRef.current = false;
      processUploads(); // 继续处理
    } else {
      // Pause
      setPaused(true);
      pausedRef.current = true;
      setUploading(false); // UI 停止转圈，但当前正在传的文件会传完
    }
  };

  const handleStart = () => {
    // Pre-check
    const pendingFiles = fileList.filter(f => f.uploadStatus !== 'success');
    const unconfirmed = pendingFiles.some(f => !f.selectedCandidateId);
    if (unconfirmed) {
        message.warning('请先确认所有文件的候选人身份（处理同名冲突）');
        return;
    }

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
      title="导入简历"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={700}
      maskClosable={!uploading}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">

        {/* 选择区域 */}
        <Dragger
          fileList={[]} // 受控，不让 Dragger 自己管理列表
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

        {/* 统计信息 */}
        {fileList.length > 0 && (
          <Alert
            message={`已选择 ${fileList.length} 个文件`}
            type="info"
            action={
               !uploading && <Button size="small" type="link" onClick={clearList} danger>清空</Button>
            }
          />
        )}

        {/* 文件列表 */}
        {fileList.length > 0 && (
          <List
            bordered
            dataSource={fileList}
            size="small"
            style={{ maxHeight: '400px', overflowY: 'auto' }}
            renderItem={(item) => (
              <List.Item
                actions={[
                   (item.uploadStatus === 'pending' || item.uploadStatus === 'error') && !uploading && (
                     <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemove(item)} />
                   )
                ]}
              >
                <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text strong ellipsis style={{ maxWidth: 300 }}>{item.name}</Text>
                        <Text type="secondary">{item.uploadStatus === 'success' ? '已完成' : item.uploadStatus === 'uploading' ? '上传中...' : item.uploadStatus === 'error' ? '失败' : '等待中'}</Text>
                    </div>

                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                         {/* Name Input */}
                         <Input
                            prefix={<UserOutlined />}
                            placeholder={item.extracting ? "AI识别中..." : "候选人姓名"}
                            value={item.candidateName}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFileList(prev => prev.map(f => f.uid === item.uid ? { ...f, candidateName: val } : f));
                                // Trigger search again if name changes? Maybe debounce?
                                // For now simple manual trigger or assume name extracted is primary
                            }}
                            addonAfter={item.extracting ? <Spin size="small" /> : null}
                            disabled={item.uploadStatus === 'success' || item.uploadStatus === 'uploading'}
                            size="small"
                        />

                        {/* Candidate Selection */}
                        {!item.extracting && !item.isSearchingCandidates && (
                             <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                {item.matchedCandidates && item.matchedCandidates.length > 0 ? (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        {item.matchedCandidates.length > 1 && (
                                            <Alert
                                                message="检测到多个同名候选人，请确认身份："
                                                type="warning"
                                                showIcon
                                                icon={<ExclamationCircleOutlined />}
                                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                            />
                                        )}
                                        <Radio.Group
                                            value={item.selectedCandidateId}
                                            onChange={(e) => setFileList(prev => prev.map(f => f.uid === item.uid ? { ...f, selectedCandidateId: e.target.value } : f))}
                                            style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                                            disabled={item.uploadStatus === 'success' || item.uploadStatus === 'uploading'}
                                        >
                                            <Radio value="new">新建候选人 (ID: {item.suggestedId})</Radio>
                                            {item.matchedCandidates.map(c => (
                                                <Radio key={c.id} value={String(c.id)}>
                                                    归档至: {c.name} (ID: {c.unique_id}) - {c.resumes_count || 0}份简历
                                                </Radio>
                                            ))}
                                        </Radio.Group>
                                    </Space>
                                ) : (
                                    <Space>
                                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                        <Text type="secondary" style={{ fontSize: '12px' }}>将创建新候选人 (ID: {item.suggestedId})</Text>
                                    </Space>
                                )}
                             </div>
                        )}
                        {item.isSearchingCandidates && <Text type="secondary" style={{ fontSize: '12px' }}><Spin size="small" /> 正在匹配候选人库...</Text>}

                        {/* Progress */}
                        {(item.uploadStatus === 'uploading' || item.uploadStatus === 'success' || item.uploadStatus === 'error') && (
                            <Progress
                                percent={item.percent}
                                size="small"
                                status={item.uploadStatus === 'error' ? 'exception' : item.uploadStatus === 'success' ? 'success' : 'active'}
                            />
                        )}
                    </Space>
                </div>
              </List.Item>
            )}
          />
        )}

        {/* 控制按钮 */}
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
