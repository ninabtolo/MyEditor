import { Editor } from '@monaco-editor/react';
import { useState, useRef, useEffect } from 'react';
import JSZip from "jszip";
import { FileText, PlusCircle, Settings, Download, Archive, Clipboard, Send, Play, Folder, ChevronRight, ChevronDown, File, X } from 'lucide-react';
import axios from 'axios';

interface FileNode {
  name: string;
  content?: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  path: string;
}

interface Tab {
  path: string;
  name: string;
  content: string;
  language: string;
}

interface CodeEditorProps {
  defaultLanguage?: string;
  defaultValue?: string;
}

export function CodeEditor({
  defaultLanguage = 'javascript',
  defaultValue = '// Start coding here...'
}: CodeEditorProps) {
  const [language, setLanguage] = useState(defaultLanguage);
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [userMessage, setUserMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [messages, setMessages] = useState<{type: 'user' | 'ai', content: string}[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const openCreateFileModal = () => {
    setIsModalOpen(true);
  };
  
  const closeCreateFileModal = () => {
    setIsModalOpen(false);
  };
  
  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile || `code.${language}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const detectLanguage = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown',
        'txt': 'plaintext',
        'xml': 'xml',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'cs': 'csharp',
        'go': 'go',
        'php': 'php',
        'rb': 'ruby',
        'swift': 'swift',
        'rs': 'rust',
        'sh': 'shell',
        'yml': 'yaml',
        'yaml': 'yaml',
        'toml': 'toml',
        'lua': 'lua',
        'r': 'r',
        'kt': 'kotlin',
        'dart': 'dart',
        'sql': 'sql'
    };
    return languageMap[extension || ''] || 'plaintext';
};

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const detectedLanguage = detectLanguage(file.name);
      
      const newTab: Tab = {
        path: file.name,
        name: file.name,
        content,
        language: detectedLanguage
      };
     
      setTabs(prev => [...prev, newTab]);
      setActiveTab(file.name);
      setCode(content);
      setLanguage(detectedLanguage);
      setCurrentFile(file.name);
      setFileTree([{
        name: file.name,
        content: content,
        type: 'file',
        path: file.name
      }]);
    };
    reader.readAsText(file);
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newFileTree: FileNode[] = [];
    const folderMap = new Map<string, FileNode>();

    for (const file of files) {
      const pathParts = file.webkitRelativePath.split('/');
      let currentPath = '';
      let currentNode = newFileTree;

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (i === pathParts.length - 1) {
          const content = await file.text();
          const fileNode: FileNode = {
            name: part,
            content,
            type: 'file',
            path: currentPath
          };
          currentNode.push(fileNode);
        } else {
          let folder = folderMap.get(currentPath);
          if (!folder) {
            folder = {
              name: part,
              type: 'folder',
              children: [],
              path: currentPath
            };
            folderMap.set(currentPath, folder);
            currentNode.push(folder);
          }
          currentNode = folder.children!;
        }
      }
    }

    setFileTree(newFileTree);
    if (files.length > 0) {
      const firstFile = files.find(f => !f.name.startsWith('.'));
      if (firstFile) {
        const content = await firstFile.text();
        const detectedLanguage = detectLanguage(firstFile.name);
        
        const newTab: Tab = {
          path: firstFile.webkitRelativePath,
          name: firstFile.name,
          content,
          language: detectedLanguage
        };
        
        setTabs(prev => [...prev, newTab]);
        setActiveTab(firstFile.webkitRelativePath);
        setCode(content);
        setLanguage(detectedLanguage);
        setCurrentFile(firstFile.name);
      }
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const openFile = (node: FileNode) => {
    if (node.type === 'file' && node.content !== undefined) {
      const detectedLanguage = detectLanguage(node.name);
      
      const existingTab = tabs.find(tab => tab.path === node.path);
      if (!existingTab) {
        const newTab: Tab = {
          path: node.path,
          name: node.name,
          content: node.content,
          language: detectedLanguage
        };
        setTabs(prev => [...prev, newTab]);
      }
      
      setActiveTab(node.path);
      setCode(node.content);
      setLanguage(detectedLanguage);
      setCurrentFile(node.name);
    }
  };

  const createNewFile = () => {
    if (!newFileName) return;
  
    const newFileNode: FileNode = {
      name: newFileName,
      type: 'file',
      path: newFileName,
      content: ''
    };
    
    setFileTree(prev => [...prev, newFileNode]);
  
    const fileLanguage = detectLanguage(newFileName);

    const newTab: Tab = {
      path: newFileName,
      name: newFileName,
      content: '',
      language: fileLanguage
    };
  
    setTabs(prev => [...prev, newTab]);
    setActiveTab(newFileName);
    setCode('');
    
    setLanguage(fileLanguage);
    
    setCurrentFile(newFileName);
  
    closeCreateFileModal();
  };
  
  const closeTab = (path: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setTabs(prev => prev.filter(tab => tab.path !== path));
    
    if (activeTab === path) {
      const remainingTabs = tabs.filter(tab => tab.path !== path);
      if (remainingTabs.length > 0) {
        const newActiveTab = remainingTabs[remainingTabs.length - 1];
        setActiveTab(newActiveTab.path);
        setCode(newActiveTab.content);
        setLanguage(newActiveTab.language);
        setCurrentFile(newActiveTab.name);
      } else {
        setActiveTab(null);
        setCode(defaultValue);
        setLanguage(defaultLanguage);
        setCurrentFile(null);
      }
    }
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab.path);
    setCode(tab.content);
    setLanguage(tab.language);
    setCurrentFile(tab.name);
  };

  const updateTabContent = (newContent: string | undefined) => {
    console.log("updateTabContent chamada!", { newContent, activeTab });
  
    if (!activeTab || !newContent) return;
  
    setCode(newContent);
    setTabs(prev => prev.map(tab =>
      tab.path === activeTab
        ? { ...tab, content: newContent }
        : tab
    ));    
  };  

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path} style={{ paddingLeft: `${level * 16}px` }}>
        <div
          className={`flex items-center space-x-2 py-1 px-2 hover:bg-gray-700 cursor-pointer ${
            currentFile === node.name ? 'bg-gray-700' : ''
          }`}
          onClick={() => node.type === 'folder' ? toggleFolder(node.path) : openFile(node)}
        >
          {node.type === 'folder' ? (
            <>
              {expandedFolders.has(node.path) ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
              <Folder className="w-5 h-5 text-gray-400" />
            </>
          ) : (
            <>
              <span className="w-4" />
              <File className="w-5 h-5 text-gray-400" />
            </>
          )}
          <span className="text-gray-300 text-sm truncate">{node.name}</span>
        </div>
        {node.type === 'folder' && expandedFolders.has(node.path) && node.children && (
          renderFileTree(node.children, level + 1)
        )}
      </div>
    ));
  };

  const saveFolder = () => {
    if (fileTree.length === 0) {
      alert("Nenhuma pasta carregada para salvar.");
      return;
    }
  
    const zip = new JSZip();
  
    const addFilesToZip = (nodes: FileNode[], folder: JSZip) => {
      nodes.forEach((node) => {
        if (node.type === "file" && node.content) {
          folder.file(node.path, node.content);
        } else if (node.type === "folder" && node.children) {
          const subFolder = folder.folder(node.path);
          if (subFolder) {
            addFilesToZip(node.children, subFolder);
          }
        }
      });
    };
  
    addFilesToZip(fileTree, zip);
  
    zip.generateAsync({ type: "blob" }).then((content) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "project.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }; 

  const runCode = async () => {
    const callback = (response: { apiStatus: string; data?: any; message?: string }) => {
      if (response.apiStatus === 'success') {
        const data = response.data;
  
        let result = '';
        if (data && data.stdout) {
          result = `Output:\n${data.stdout}`;  
        } else if (data && data.stderr) {
          result = `Runtime Error:\n${data.stderr}`;
        } else if (data && data.compile_output) {
          result = `Compilation Error:\n${data.compile_output}`;
        } else {
          result = 'No output generated or no valid response from API.';
        }
  
        console.log('Resultado do código:', result);
        setOutput(result);
      } else if (response.apiStatus === 'loading') {
        setOutput('Running...');
      } else {
        setOutput(`Error: ${response.message}`);
        console.error('Erro na execução:', response);
      }
    };
  
    try {
      const response = await axios.post('http://localhost:3000/run-code', {
        code: code, 
        language: language, 
        stdin: "",
      });
  
      callback(response.data);
    } catch (error) {
      callback({ apiStatus: 'error', message: error.message });
    }
  
    console.log('Código antes de enviar:', code);
    console.log('Linguagem:', language);
  };
  
  const sendRequest = async () => {
    if (!userMessage.trim()) return;

    // Add user message to chat
    const newUserMessage = { type: 'user', content: userMessage };
    setMessages((prev) => [...prev, newUserMessage]);

    setIsFetching(true);
    // Add loading message
    const loadingMessage = { type: 'ai', content: 'Aguardando resposta...' };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: userMessage,
      });

      // Handle successful response from backend
      if (response.data.success) {
        const aiResponse = response.data.data;

        // Replace loading message with actual response
        setMessages((prev) => prev.slice(0, -1).concat({ type: 'ai', content: aiResponse }));
        setAiResponse(aiResponse);
      } else {
        throw new Error(response.data.error || 'Unknown error occurred');
      }
    } catch (error) {
      const errorMessage = 'Erro ao conectar ao servidor: ' + (error.message || '');
      // Replace loading message with error
      setMessages((prev) => prev.slice(0, -1).concat({ type: 'ai', content: errorMessage }));
      setAiResponse(errorMessage);
      console.error('Erro:', error);
    } finally {
      setIsFetching(false);
      setUserMessage('');
    }
  };

  const copyToClipboard = (message: string) => {
    navigator.clipboard.writeText(message);
    alert("Resposta copiada para a área de transferência!");
  };
  
  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-900 text-gray-200 rounded-lg p-2 overflow-hidden">
      <div className="lg:w-1/3 w-full border-blue-900 border rounded-lg lg:mr-4 mb-4 lg:mb-0 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-blue-900 bg-blue-950">
          <h2 className="text-lg font-semibold text-blue-100">Chat com IA</h2>
        </div>
        <div 
          ref={chatContainerRef} 
          className="flex-1 p-4 overflow-auto bg-gradient-to-b from-slate-900 to-slate-950"
        >
          {messages.length === 0 ? (
            <div className="text-blue-300 text-center mt-4 opacity-60">
              Nenhuma conversa iniciada. Envie uma mensagem para começar.
            </div>
          ) : (
            messages.map((msg, index) => (
              <div 
                key={index} 
                className={`mb-4 ${msg.type === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
              >
                <div 
                  className={`
                    p-3 rounded-lg max-w-[85%] relative group 
                    ${msg.type === 'user' 
                      ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-tr-none shadow-md' 
                      : 'bg-gradient-to-r from-slate-800 to-slate-700 text-gray-200 rounded-tl-none border-l-2 border-blue-500 shadow-md'
                    }
                  `}
                >
                  <pre className="whitespace-pre-wrap break-words text-sm">
                    {msg.content}
                  </pre>
                  {msg.type === 'ai' && (
                    <button 
                      onClick={() => copyToClipboard(msg.content)} 
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-300"
                    >
                      <Clipboard className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-blue-900 relative">
          <textarea
            className="w-full bg-slate-800 text-gray-200 p-4 pr-14 rounded-b-lg resize-none border-0 focus:ring-1 focus:ring-blue-500 focus:outline-none h-24 md:h-16 block"
            placeholder="Digite sua mensagem..."
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendRequest();
              }
            }}
          />
          <button
            onClick={sendRequest}
            className="absolute right-4 bottom-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white p-2 rounded-full flex items-center justify-center transition-colors shadow-md"
            disabled={isFetching}
            title={isFetching ? "Enviando..." : "Enviar"}
          >
            {isFetching ? 
              <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : 
              <Send className="w-5 h-5" />
            }
          </button>
        </div>
      </div>
  
      <div className="flex-1 flex border-blue-900 border rounded-lg overflow-hidden">
        <div className="w-1/4 max-w-[200px] min-w-[120px] border-r border-blue-900 flex flex-col bg-slate-950">
          <div className="p-3 border-b border-blue-900 h-[50px] flex items-center justify-between bg-blue-950">
            <span className="text-blue-100 font-medium truncate mr-1">Files</span>
            <div className="flex space-x-2 flex-shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-300 hover:text-blue-100"
                title="Open File"
              >
                <FileText className="w-5 h-5" />
              </button>
              <button
                onClick={() => folderInputRef.current?.click()}
                className="text-blue-300 hover:text-blue-100"
                title="Open Folder"
              >
                <Folder className="w-5 h-5" />
              </button>
              <button onClick={openCreateFileModal} className="text-blue-300 hover:text-blue-100" title="New File">
                <PlusCircle className="w-5 h-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".js,.ts,.py,.html,.css,.json,.md,.txt"
              />
              <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderUpload}
                className="hidden"
                webkitdirectory=""
                directory=""
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-gradient-to-b from-slate-900 to-slate-950">
            {renderFileTree(fileTree).map(node => 
              React.cloneElement(node, {
                ...node.props,
                children: React.Children.map(node.props.children, child => {
                  if (child.props.className && child.props.className.includes('flex items-center space-x-2')) {
                    return React.cloneElement(child, {
                      ...child.props,
                      children: React.Children.map(child.props.children, innerChild => {
                        // Increase icon sizes in file tree
                        if (innerChild.type && ['ChevronDown', 'ChevronRight', 'Folder', 'File'].includes(innerChild.type.name)) {
                          return React.cloneElement(innerChild, {
                            ...innerChild.props,
                            className: innerChild.props.className.replace('w-4 h-4', 'w-5 h-5')
                          });
                        }
                        return innerChild;
                      })
                    });
                  }
                  return child;
                })
              })
            )}
          </div>
        </div>
  
        <div className="flex-1 flex flex-col">
          <div className="border-b border-blue-900 h-[50px] flex items-center justify-between px-2 lg:px-4 bg-blue-950">
            <div className="hidden sm:flex items-center space-x-2 lg:space-x-4">
              <button onClick={handleDownload} className="text-blue-300 hover:text-blue-100" title="Download">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={saveFolder} className="text-blue-300 hover:text-blue-100" title="Save Folder">
                <Archive className="w-5 h-5" />
              </button>
              <button onClick={() => setTheme(theme === "vs-dark" ? "light" : "vs-dark")} className="text-blue-300 hover:text-blue-100" title="Toggle Theme">
                <Settings className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center space-x-2 lg:space-x-4 ml-auto">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-slate-800 text-gray-200 px-3 py-1 rounded-md border border-blue-900 text-sm focus:outline-none w-[120px]"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
                <option value="go">Go</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
              </select>
              <button
                onClick={runCode}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-3 py-1 rounded-md flex items-center justify-center transition-colors min-w-[80px]"
              >
                <Play className="w-5 h-5" />
                <span className="ml-1">Run</span>
              </button>
            </div>
          </div>

          <div className="border-b border-blue-900 bg-slate-900 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-blue-800 scrollbar-track-slate-900">
            <div className="flex">
              {tabs.map((tab) => (
                <div
                  key={tab.path}
                  className={`flex items-center px-3 py-2 border-r border-blue-900 cursor-pointer ${
                    activeTab === tab.path 
                      ? "bg-gradient-to-r from-blue-800 to-blue-900 text-white" 
                      : "text-blue-300 hover:bg-blue-900/30"
                  }`}
                  onClick={() => switchTab(tab)}
                >
                  <span className="truncate max-w-[120px]">{tab.name}</span>
                  <button 
                    className="ml-2 p-1 hover:bg-blue-800 rounded-full" 
                    onClick={(e) => closeTab(tab.path, e)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
  
          <div className={`flex-1 grid ${tabs.length > 0 ? 'grid-rows-[2fr,1fr]' : 'grid-rows-[1fr,1fr]'} overflow-hidden`}>
            <Editor
              height="100%"
              defaultLanguage={language}
              language={language}
              theme={theme}
              value={code}
              onChange={(value) => updateTabContent(value)}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: "on",
                automaticLayout: true,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                roundedSelection: false,
                padding: { top: 16 },
              }}
            />
            <div className="bg-slate-950 text-gray-200 p-4 font-mono text-sm overflow-auto border-t border-blue-900">
              <h3 className="text-xs uppercase tracking-wide text-blue-400 mb-2">Output</h3>
              <pre className="whitespace-pre-wrap">{output || "Run your code to see the output here..."}</pre>
            </div>
          </div>
        </div>
      </div>
  
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-blue-900 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-blue-100 text-lg font-semibold mb-4">Criar Novo Arquivo</h2>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Nome do arquivo"
              className="w-full p-2 rounded-md bg-slate-900 text-gray-200 border border-blue-800 focus:border-blue-500 focus:outline-none mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button 
                onClick={closeCreateFileModal} 
                className="bg-slate-700 hover:bg-slate-600 text-gray-200 py-2 px-4 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createNewFile}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-2 px-4 rounded-md transition-colors"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );  
}
