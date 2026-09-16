// 数据库实体类型
export interface Album {
    id: number;
    name: string;
    path: string;
    audio_count: number;
    is_visible?: number; // 0 = 不显示, 1 = 显示
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
export interface PasswordStatusResponse extends Record<string, unknown> {
    hasPassword: boolean;
    message: string;
}

export interface PasswordOperationResponse extends Record<string, unknown> {
    message: string;
}

export interface ErrorResponse extends Record<string, unknown> {
    error: string;
}

// API 响应类型
export interface AudioFileResponse {
    id: string | number;
    album_id: string | number;
    filename: string;
    filepath: string;
    file_size?: number;
    duration: number | null;
    album_name?: string;
    created_at: string | null;
    updated_at?: string;
}

/** 音频列表窗口化响应（对齐 multitune：全量 ID + 分页详情） */
export interface AudioFilesListResponse {
    items: AudioFileResponse[];
    total: number;
    audio_ids: number[];
    offset: number;
    limit: number;
    window_threshold: number;
}

export interface AudioFilesBatchResponse {
    items: AudioFileResponse[];
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
    /** 全量有序音频 ID（虚拟列表骨架） */
    audioIds: number[];
    /** 首屏已加载的详情，用于预热缓存 */
    initialFiles: AudioFile[];
    /** 超过该阈值时播放列表使用虚拟滚动 */
    windowThreshold: number;
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
