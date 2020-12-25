export interface TaoPassAPIResponse {
  code: number;
  data: {
    url: string;
    content: string;
    picUrl: string;
    expire: string;
  };
}

export interface ShortlinkExtraData {
  title: string;
  pic: string;
}

export interface Parsed {
  url: string;
  title?: string;
  picUrl?: string;
  expired?: Date;
}

export class TaokoulingError extends Error {
  name = 'TaokoulingError';

  constructor(message: string) {
    super(message);
  }
}
