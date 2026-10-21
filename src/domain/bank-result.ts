export type UnavailableCause = "timeout" | "network_error" | "invalid_response";

export type BankResult =
  | {
      status: "approved";
      bankId: string;
      bankName: string;
      approvedAmount: number;
      monthlyRate: number; 
      termMonths: number;
      installmentValue: number;
    }
  | {
      status: "rejected";
      bankId: string;
      bankName: string;
      reason: string;
    }
  | {
      status: "unavailable";
      bankId: string;
      bankName: string;
      cause: UnavailableCause;
      message: string;
    };