export type UserRole =
  | 'consumer'
  | 'farmer'
  | 'fpo'
  | 'fpo_admin'
  | 'bulk_buyer'
  | 'delivery_partner'
  | 'collection_center_operator'
  | 'admin'
  | 'support';

export type UserStatus = 'pending' | 'verified' | 'rejected' | 'suspended' | 'active';

export interface User {
  id: string;
  phoneNumber: string;
  email?: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  language: 'en' | 'ta';
  prefersDarkMode?: boolean;
  photoUrl?: string;
  address?: Address;
  kycStatus?: 'pending' | 'submitted' | 'verified';
  registeredAt: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  notificationPreferences?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    priceAlerts?: boolean;
    orderUpdates?: boolean;
    promotional?: boolean;
  };
}

export interface Address {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface ServiceArea {
  id: string;
  district: string;
  pincode: string;
  city?: string;
  isActive: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  minOrderAmount: number;
  avgDeliveryTimeMins: number;
  slotsAvailable: string[];
}

export interface FarmerProfile {
  id: string;
  userId: string;
  farmName: string;
  farmSizeAcres: number;
  cropsGrown: string[];
  district: string;
  village: string;
  state: string;
  languagesSpoken: string[];
  kycDocuments: { docType: string; uploadedAt: string; status: string }[];
  bankAccount: {
    accountNumberMasked: string;
    ifsc: string;
    bankName: string;
    accountHolderName: string;
  };
  bio?: string;
  profilePhoto?: string;
  certifications: string[];
  yearsOfExperience: number;
  averageRating: number;
  totalRatings: number;
  settlementsEnabled: boolean;
  preferredLanguages: ('en' | 'ta')[];
}

export interface FPO {
  id: string;
  userId: string;
  name: string;
  registrationNumber: string;
  incorporationDate: string;
  state: string;
  district: string;
  headquarters: string;
  farmers: { farmerId: string; name: string; joinedAt: string }[];
  memberFarmersCount: number;
  totalFarmAreaAcres: number;
  primaryCrops: string[];
  certifications: string[];
  averageRating: number;
  totalRatings: number;
  isActive: boolean;
}

export type ProductCategory = 'vegetables' | 'fruits' | 'grains' | 'pulses' | 'spices' | 'oilseeds' | 'dairy' | 'organic' | 'processed' | 'seeds' | 'bulk' | 'seasonal';

export type CategoryName = ProductCategory;

export interface Category {
  id: string;
  name: ProductCategory;
  displayNameEn: string;
  displayNameTa: string;
  icon: string;
  description: string;
  productCount: number;
  isActive: boolean;
  order: number;
}

export interface Product {
  id: string;
  categoryId: string;
  category: ProductCategory;
  name: string;
  nameTa: string;
  description: string;
  descriptionTa?: string;
  images: string[];
  unit: string;
  unitTa?: string;
  basePricePerUnit: number;
  currentPricePerUnit: number;
  minOrderQuantity: number;
  availableQuantity: number;
  farmerId: string;
  fpoId?: string;
  producer: { id: string; name: string; entityType: 'farmer' | 'fpo' };
  sourceLocation: {
    district: string;
    village?: string;
    state: string;
    geo?: GeoPoint;
  };
  grade: 'Premium' | 'A' | 'B' | 'Organic';
  packagingType: string;
  harvestDate: string;
  shelfLifeDays: number;
  deliveryEstimateMins: number;
  isOrganic: boolean;
  isOrganicCertified: boolean;
  certifications: string[];
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  avgRating: number;
  totalRatings: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductListing {
  id: string;
  product: Product;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  minQuantity: number;
  availableFrom: string;
  availableUntil: string;
  harvestDate: string;
  pickupLocation: string;
  status: 'active' | 'inactive' | 'sold_out';
  isFeatured: boolean;
  createdAt: string;
}

export interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  harvestDate: string;
  sourceFarm: string;
  sourceLocation: string;
  currentStatus: 'harvested' | 'collected' | 'in_cold_storage' | 'in_transit' | 'at_dc' | 'out_for_delivery' | 'delivered' | 'rejected';
  qualityChecks: {
    pestHallmark: boolean;
    pesticideTestUrl?: string;
    moistureContent: number;
    freshnessScore: number;
    checkedBy: string;
    checkedAt: string;
  };
  traceabilityEvents: TraceabilityEvent[];
  temperatureLogs: { timestamp: string; tempCelsius: number; location: string }[];
  coldChainMaintained: boolean;
  sustainabilityRecord?: SustainabilityRecord;
}

export interface TraceabilityEvent {
  id: string;
  timestamp: string;
  status: string;
  location: string;
  description: string;
  operator: string;
  photoUrl?: string;
  verified: boolean;
}

export interface TraceabilityPassport {
  id: string;
  batchId: string;
  batchNumber: string;
  productName: string;
  farmerName: string;
  farmName: string;
  farmLocation: string;
  harvestDate: string;
  coldChainLog: { timestamp: string; temp: number }[];
  qualityChecks: { date: string; parameter: string; result: string; certifiedBy: string }[];
  certifications: string[];
  journey: TraceabilityEvent[];
}

export interface CartItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unit: string;
  selectedPackaging?: string;
  monthlyPlanId?: string;
  pricePerUnit: number;
  farmerShare: number;
  addedAt: string;
}

export interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  total: number;
  estimatedFarmerShare: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'placed' | 'confirmed' | 'processing' | 'packed' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'processing' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'cod' | 'wallet';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  farmerShareAmount: number;
  batchId?: string;
  status?: 'pending' | 'accepted' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
}

export interface OrderTimelineEvent {
  id: string;
  status: OrderStatus;
  timestamp: string;
  title: string;
  description: string;
  location?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  farmerShare: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryAddress: Address;
  deliverySlot: { date: string; startTime: string; endTime: string };
  deliveryPartnerId?: string;
  bulkRequirementId?: string;
  groupOrderId?: string;
  timeline: OrderTimelineEvent[];
  cancellation?: { reason: string; cancelledBy: string; timestamp: string };
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  gatewayReference: string;
  status: PaymentStatus;
  processedAt: string;
  refunds?: { id: string; amount: number; reason: string; initiatedAt: string }[];
}

export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type SettlementType = 'single_order' | 'weekly' | 'biweekly' | 'monthly';

export interface Settlement {
  id: string;
  settlementNumber: string;
  farmerId?: string;
  fpoId?: string;
  recipientType: 'farmer' | 'fpo';
  fromDate: string;
  toDate: string;
  totalSales: number;
  commission: number;
  logisticsCost: number;
  packagingCost: number;
  netAmount: number;
  ordersCount: number;
  status: SettlementStatus;
  settlementType: SettlementType;
  bankAccount: { accountNumberMasked: string; ifsc: string; bankName: string };
  processedAt?: string;
  invoiceUrl?: string;
  createdBy: 'auto' | 'admin';
  lineItems: { orderId: string; orderNumber: string; amount: number; date: string }[];
  createdAt: string;
}

export interface RouteStop {
  orderId: string;
  orderNumber: string;
  sequence: number;
  address: Address;
  status: 'pending' | 'reached' | 'delivered' | 'failed' | 'skipped';
  distanceFromPrevKm: number;
  estimatedArrival: string;
  contactName?: string;
  contactPhone?: string;
  itemsSummary: string;
  deliveryInstructions?: string;
  packagesCount: number;
}

export interface DeliveryRoute {
  id: string;
  deliveryPartnerId: string;
  date: string;
  zone: string;
  stops: RouteStop[];
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  totalStops: number;
  completedStops: number;
  currentStopIndex?: number;
  totalDistanceKm: number;
  avgStopDurationMins: number;
  createdAt: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  orderNumber: string;
  routeId?: string;
  deliveryPartnerId?: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
  currentLocation?: GeoPoint;
  proofOfDelivery?: { photoUrl: string; receivedBy: string; timestamp: string; signatureUrl?: string };
  timeline: { timestamp: string; status: string; location?: string; note?: string }[];
  startedAt?: string;
  deliveredAt?: string;
  estimatedDeliveryTime?: string;
}

export interface BulkRequirementStatus {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerCompany?: string;
  productName: string;
  productCategory: ProductCategory;
  quantity: number;
  unit: string;
  preferredGrade?: string;
  budgetPerUnit?: number;
  deliveryLocation: Address;
  deliveryDeadline: string;
  recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  description?: string;
  status: 'open' | 'quoted' | 'awarded' | 'fulfilled' | 'cancelled';
  quotationDeadline: string;
  quotationsCount?: number;
  createdAt: string;
}

export interface BulkRequirement extends BulkRequirementStatus {}

export interface Quotation {
  id: string;
  requirementId: string;
  supplierId: string;
  supplierType: 'farmer' | 'fpo';
  supplierName: string;
  pricePerUnit: number;
  totalQuote: number;
  availableQuantity: number;
  expectedDeliveryDate: string;
  qualityCommitments: string[];
  avgRating: number;
  notes: string;
  status: 'submitted' | 'shortlisted' | 'accepted' | 'rejected';
  submittedAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  requirementId: string;
  buyerId: string;
  supplierId: string;
  items: { productName: string; quantity: number; unit: string; pricePerUnit: number; totalPrice: number }[];
  totalAmount: number;
  gst: number;
  deliveryDate: string;
  paymentTerms: string;
  deliveryAddress: Address;
  status: 'draft' | 'issued' | 'accepted' | 'in_fulfillment' | 'delivered' | 'invoiced' | 'paid' | 'cancelled';
  createdAt: string;
}

export interface ForecastType { id: string; name: string; description: string; }
export type ForecastGranularity = 'daily' | 'weekly' | 'monthly' | 'seasonal';
export type ForecastConfidence = 'high' | 'medium' | 'low';

export interface Forecast {
  id: string;
  productId: string;
  productName: string;
  category: ProductCategory;
  location: string;
  period: { from: string; to: string };
  predictedDemandUnits: number;
  predictedPriceRange: { low: number; high: number };
  confidenceScore: number;
  confidence: ForecastConfidence;
  factors: string[];
  weatherInfluence?: string;
  seasonality: string[];
  marketTrends?: string[];
  recommendedAction: string;
  recommendedPlantingQuantity?: string;
  advisoryNotes: string;
  lastUpdated: string;
}

export interface Recommendation {
  id: string;
  type: 'price' | 'crop' | 'logistics' | 'demand' | 'subscription' | 'stock';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'settlement' | 'system' | 'promotion' | 'alert';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  photoUrl?: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export type PlanFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface Subscription {
  id: string;
  userId: string;
  planName: string;
  products: { productId: string; quantity: number; chosenDays: string[] }[];
  frequency: PlanFrequency;
  deliveryDay: string;
  deliverySlot: string;
  monthlyCost: number;
  nextDeliveryDate: string;
  status: 'active' | 'paused' | 'cancelled';
  pauseDates?: { from: string; to: string }[];
  createdAt: string;
}

export interface GroupOrder {
  id: string;
  groupName: string;
  organizerId: string;
  organizerName: string;
  society: string;
  location: string;
  products: { productId: string; name: string; quantity: number; unit: string }[];
  totalValue: number;
  participantsCount: number;
  sharedSavings: number;
  status: 'open' | 'consolidating' | 'ordered' | 'arrived' | 'distributed' | 'closed';
  deliveryDate: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  orderId: string;
  userId: string;
  issueType: 'quality' | 'delivery' | 'quantity' | 'payment' | 'other';
  description: string;
  photoUrl?: string;
  status: 'submitted' | 'under_review' | 'action_taken' | 'resolved' | 'rejected';
  resolution?: string;
  refundAmount?: number;
  closedAt?: string;
  createdAt: string;
}

export interface SustainabilityRecord {
  co2SavedKg: number;
  plasticPackagingKg: number;
  waterSavedLiters: number;
  farmersSupported: number;
  organicCertified: boolean;
  compostingEnabled: boolean;
}

export interface FairPriceData {
  id: string;
  productId: string;
  productName: string;
  farmGatePrice: number;
  mandiPrice: number;
  retailPrice: number;
  vaikkalPrice: number;
  farmerSharePct: number;
  updatedAt: string;
}

export interface LoggedInUser extends User {}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: { total: number; page: number; perPage: number; totalPages: number };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface CartTotals {
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  total: number;
  farmerShare: number;
}

export interface DropdownOption {
  value: string;
  label: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}