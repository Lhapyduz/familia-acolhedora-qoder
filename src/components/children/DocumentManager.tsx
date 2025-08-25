import React from 'react';
import { FileText, Upload, Download } from 'lucide-react';
import type { Child } from '../../types/index.js';

interface DocumentManagerProps {
  child: Child;
  onDocumentUpdate: (childId: string, documents: any[]) => Promise<void>;
  disabled?: boolean;
}

function DocumentManager({ child, onDocumentUpdate, disabled = false }: DocumentManagerProps): JSX.Element {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Documentos</h3>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Gerenciamento de Documentos
        </h4>
        <p className="text-sm text-gray-500 mb-4">
          Upload e gestão de documentos da criança
        </p>
        <button
          disabled={disabled}
          className="btn-primary flex items-center space-x-2 mx-auto"
        >
          <Upload className="h-4 w-4" />
          <span>Fazer Upload</span>
        </button>
      </div>
      
      {/* Document List Placeholder */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Certidão de Nascimento</p>
              <p className="text-xs text-gray-500">Documento obrigatório</p>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentManager;