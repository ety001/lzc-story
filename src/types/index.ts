// 数据库实体类型
export interface Album {
    id: number;
    name: string;
    path: string;
    audio_count: number;
    created_at: string;
    updated_at: string;
}

export interface AudioFile {
    id: number;
    album_id: number;
    filename: string;
    filepath: string;
    duration: number;
    album_name: string;
    created_at: string;
    updated_at: string;
}

export interface PlayHistoryItem {
    id?: number;
    album_id: number;
    album_name: string;
    audio_file_id: number;
    filename: string;
    filepath: string;
    played_at: string;
    play_time?: number;
}

export interface AdminConfig {
    id: number;
    key: string;
    value: string;
    created_at: string;
}

// 管理员密码配置类型（用于数据库存储）
export interface AdminPasswordConfig {
    id: number;
    password_hash: string;
    created_at: string;
    updated_at?: string;
}

// 管理员会话类型
export interface AdminSession {
    id: number;
    token: string;
    expires_at: string;
    created_at: string;
}

// API 请求类型
export interface SetPasswordRequest {
    password: string;
}

export interface VerifyPasswordRequest {
    password: string;
}

// API 响应类型
export interface PasswordStatusResponse {
    hasPassword: boolean;
    message: string;
}

export interface PasswordOperationResponse {
    message: string;
}

export interface ErrorResponse {
    error: string;
}

// API 响应类型
export interface AudioFileResponse {
    id: string | number;
    album_id: string | number;
    filename: string;
    filepath: string;
    file_size: number;
    duration: number | null;
    created_at: string | null;
}

export interface PlayHistoryResponse {
    id: number;
    album_id: number;
    audio_file_id: number;
    play_time: number;
    played_at: string;
}

export interface DatabaseTestResult {
    success: boolean;
    message: string;
    timestamp: string;
    database: {
        path: string;
        tables?: string[];
        stats?: Record<string, number | string>;
        exists?: boolean;
        size?: number;
        sampleAlbums?: Album[];
        sampleAudioFiles?: AudioFile[];
        samplePlayHistory?: PlayHistoryItem[];
        adminConfig?: AdminConfig[];
        albums?: Album[];
        audioFiles?: AudioFile[];
        playHistory?: PlayHistoryItem[];
    };
}

// 组件 Props 类型
export interface AudioPlayerProps {
    album: Album;
    audioFiles: AudioFile[];
    onBack: () => void;
    autoPlay?: boolean;
    selectedHistoryItem?: {
        audio_file_id: number;
        play_time?: number;
    } | null;
}

export interface AlbumSelectorProps {
    onBack: () => void;
    onSelectAlbum: (album: Album) => void;
}

export interface LazyCatIconProps {
    className?: string;
    size?: number;
}

export interface PasswordSetupProps {
    onComplete: () => void;
}

export interface PasswordVerifyProps {
    onSuccess: () => void;
    onBack: () => void;
}

export interface AdminInterfaceProps {
    onBack: () => void;
}

export interface PlayHistoryProps {
    onBack: () => void;
}

export interface ClientOnlyProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}
