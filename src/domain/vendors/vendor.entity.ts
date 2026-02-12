export interface IVendorConfig {
  vendor_id: string;
  name: string;
  allowed_countries: string[];
  blocked_countries: string[];
  api_key: string;
}
