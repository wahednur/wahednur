export interface CloudinaryUploadResult extends CloudinaryUploadWidgetResults {
  info: {
    secure_url: string;
    public_id: string;
    [key: string]: unknown;
  };
}
