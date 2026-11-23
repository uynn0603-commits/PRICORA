export const wedding = [
  "photo-1519741497674-611481863552",
  "photo-1511285560929-80b456fea0bc",
  "photo-1465495976277-4387d4b0b4c6",
  "photo-1519225421980-715cb0215aed",
  "photo-1520854221256-17451cc331bf",
  "photo-1516589178581-6cd7833ae3b2",
  "photo-1522673607200-164d1b6ce486",
  "photo-1537633552985-df8429e8048b",
  "photo-1583939003579-730e3918a45a",
  "photo-1591604466107-ec97de577aff",
  "photo-1606800052052-a08af7148866",
  "photo-1460978812857-470ed1c77af0",
  "photo-1502635385003-ee1e6a1a742d",
  "photo-1478146896981-b80fe463b330",
];

export const weddingExtra = [
  "photo-1529636798458-92182e662485",
  "photo-1546032996-6dfacbacbf3f",
  "photo-1594552072238-b8a33785b261",
  "photo-1469371670807-013ccf25f16a",
  "photo-1606216794074-735e91aa2c92",
];

export const outdoor = [
  "photo-1469474968028-56623f02e42e",
  "photo-1506744038136-46273834b3fb",
  "photo-1470071459604-3b5ec3a7fe05",
  "photo-1441974231531-c6227db76b6e",
  "photo-1490750967868-88aa4486c946",
];

export const moody = [
  "photo-1474552226712-ac0f0961a954",
  "photo-1418065460487-3e41a6c84dc5",
  "photo-1500534314209-a25ddb2bd429",
  "photo-1475924156734-496f6cac6ec1",
  "photo-1426604966848-d7adac402bff",
  "photo-1470252649378-9c29740c9fa8",
  "photo-1544077960-604201fe74bc",
];

export const cameras = [
  "photo-1452587925148-ce544e77e70d",
  "photo-1516035069371-29a1b244cc32",
  "photo-1554048612-b6a482bc67e5",
  "photo-1552168324-d612d77725e3",
  "photo-1471341971476-ae15ff5dd4ea",
];

export const women = [
  "photo-1531746020798-e6953c6e8e04",
  "photo-1534528741775-53994a69daeb",
  "photo-1524504388940-b1c1722653e1",
  "photo-1488426862026-3ee34a7d66df",
  "photo-1529626455594-4ff0802cfb7e",
  "photo-1517841905240-472988babdf9",
  "photo-1494790108377-be9c29b29330",
  "photo-1544005313-94ddf0286df2",
  "photo-1531123897727-8f129e1688ce",
  "photo-1487412720507-e7ab37603c6f",
];

export const fashion = [
  "photo-1469334031218-e382a71b716b",
  "photo-1487412947147-5cebf100ffc2",
  "photo-1554151228-14d9def656e4",
  "photo-1438761681033-6461ffad8d80",
  "photo-1524502397800-2eeaad7c3fe5",
  "photo-1483985988355-763728e1935b",
];

export const men = [
  "photo-1539571696357-5a69c17a67c6",
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1506794778202-cad84cf45f1d",
  "photo-1500648767791-00dcc994a43e",
  "photo-1521119989659-a83eee488004",
  "photo-1463453091185-61582044d556",
  "photo-1501196354995-cbb51c65aaea",
  "photo-1519085360753-af0119f7cbe7",
  "photo-1504257432389-52343af06ae3",
];

export const graduation = [
  "photo-1541339907198-e08756dedf3f",
  "photo-1627556704290-2b1f5853ff78",
  "photo-1523580846011-d3a5bc25702b",
  "photo-1590012314607-cda9d9b699ae",
  "photo-1529333166437-7750a6dd5a70",
  "photo-1523240795612-9a054b0db644",
  "photo-1523580494863-6f3031224c94",
  "photo-1562774053-701939374585",
  "photo-1607237138185-eedd9c632b0b",
  "photo-1427504494785-3a9ca7044f45",
  "photo-1524178232363-1fb2b075b655",
  "photo-1516589091380-5d8e87df6999",
];

export const events = [
  "photo-1492684223066-81342ee5ff30",
  "photo-1511578314322-379afb476865",
  "photo-1501281668745-f7f57925c3b4",
  "photo-1429962714451-bb934ecdc4ec",
  "photo-1470229722913-7c0e2dbbafd3",
  "photo-1464366400600-7168b8af9bc3",
  "photo-1514525253161-7a46d19cd819",
  "photo-1505373877841-8d25f7d46678",
  "photo-1519671482749-fd09be7ccebf",
  "photo-1530103862676-de8c9debad1d",
  "photo-1515169067868-5387ec356754",
];

export function rotate(list: string[], amount: number): string[] {
  const count = amount % list.length;
  return list.slice(count).concat(list.slice(0, count));
}
