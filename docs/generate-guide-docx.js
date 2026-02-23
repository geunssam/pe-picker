const fs = require('fs');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  LevelFormat,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  PageNumber,
  ExternalHyperlink,
  PageBreak,
} = require('docx');

// ── 색상 & 스타일 상수 ──
const C = {
  primary: '4A6CF7', // 메인 파란색
  accent: 'F97316', // 주황 액센트
  dark: '1E293B', // 거의 검정
  gray: '64748B', // 본문 보조
  lightBg: 'F1F5F9', // 연한 배경
  headerBg: 'E2E8F0', // 테이블 헤더
  tipBg: 'FFF7ED', // 팁/인용 배경
  white: 'FFFFFF',
};

const FONT = 'Arial';
const FONT_KR = '맑은 고딕';

// ── 테이블 헬퍼 ──
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

function headerCell(text, width) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: C.headerBg, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        spacing: { before: 60, after: 60 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, size: 20, font: FONT_KR, color: C.dark })],
      }),
    ],
  });
}

function dataCell(text, width, opts = {}) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shade ? { fill: opts.shade, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        indent: { left: 80 },
        children: [
          new TextRun({
            text,
            size: opts.size || 19,
            font: FONT_KR,
            bold: !!opts.bold,
            color: opts.color || C.dark,
          }),
        ],
      }),
    ],
  });
}

function boldDataCell(label, desc, width) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        indent: { left: 80 },
        children: [
          new TextRun({ text: label, size: 19, font: FONT_KR, bold: true, color: C.dark }),
          ...(desc ? [new TextRun({ text: desc, size: 19, font: FONT_KR, color: C.gray })] : []),
        ],
      }),
    ],
  });
}

// ── 인용 박스 (팁/안내) ──
function tipBox(text) {
  return new Table({
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.SINGLE, size: 6, color: C.primary },
              right: { style: BorderStyle.NONE, size: 0 },
            },
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: C.tipBg, type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                spacing: { before: 80, after: 80 },
                indent: { left: 120 },
                children: [
                  new TextRun({ text, size: 18, font: FONT_KR, color: C.gray, italics: true }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ── 소제목 ──
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, font: FONT_KR })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 160 },
    children: [new TextRun({ text, font: FONT_KR })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: FONT_KR })],
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.spaceBefore || 60, after: opts.spaceAfter || 60 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: [
      new TextRun({
        text,
        size: opts.size || 20,
        font: FONT_KR,
        color: opts.color || C.dark,
        bold: !!opts.bold,
      }),
    ],
  });
}
function pBold(label, rest) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({ text: label, size: 20, font: FONT_KR, bold: true, color: C.dark }),
      new TextRun({ text: rest, size: 20, font: FONT_KR, color: C.dark }),
    ],
  });
}
function spacer(h = 120) {
  return new Paragraph({ spacing: { before: h, after: 0 }, children: [] });
}
function hr() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0', space: 1 } },
    children: [],
  });
}

// ── 문서 빌드 ──
const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT_KR, size: 20 } } },
    paragraphStyles: [
      {
        id: 'Title',
        name: 'Title',
        basedOn: 'Normal',
        run: { size: 52, bold: true, color: C.primary, font: FONT_KR },
        paragraph: { spacing: { before: 0, after: 80 }, alignment: AlignmentType.CENTER },
      },
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 32, bold: true, color: C.dark, font: FONT_KR },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 26, bold: true, color: C.primary, font: FONT_KR },
        paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 22, bold: true, color: C.dark, font: FONT_KR },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullet',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: 'bullet-indent',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
          },
        ],
      },
      ...[
        'num-start',
        'num-wizard',
        'num-tag',
        'num-tag-result',
        'num-group',
        'num-group-result',
        'num-badge-award',
        'num-whistle',
        'num-timer',
        'num-s1',
        'num-s2',
        'num-s3',
        'num-s4',
        'num-s5',
        'num-s6',
        'num-safari',
        'num-chrome-ios',
        'num-android',
      ].map(ref => ({
        reference: ref,
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      })),
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
          size: { width: 12240, height: 15840 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: 'PEPick! 사용 가이드',
                  size: 16,
                  font: FONT_KR,
                  color: C.gray,
                  italics: true,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'PEPick! \u00A9 2026 | pepick.help@gmail.com | ',
                  size: 16,
                  font: FONT_KR,
                  color: C.gray,
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 16,
                  font: FONT_KR,
                  color: C.gray,
                }),
                new TextRun({ text: ' / ', size: 16, font: FONT_KR, color: C.gray }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  size: 16,
                  font: FONT_KR,
                  color: C.gray,
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        // ===== 타이틀 =====
        spacer(400),
        new Paragraph({
          heading: HeadingLevel.TITLE,
          children: [new TextRun({ text: 'PEPick!', font: FONT_KR })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 40 },
          children: [
            new TextRun({
              text: '체육 수업 도우미 사용 가이드',
              size: 26,
              font: FONT_KR,
              color: C.gray,
            }),
          ],
        }),
        spacer(60),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 20 },
          children: [
            new TextRun({
              text: '체육 수업에서 술래 뽑기, 모둠 나누기, 인성 배지, 타이머, 휘슬까지',
              size: 20,
              font: FONT_KR,
              color: C.dark,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          children: [
            new TextRun({
              text: '폰 하나로 해결하는 웹앱입니다.',
              size: 20,
              font: FONT_KR,
              color: C.dark,
            }),
          ],
        }),
        spacer(40),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: '접속 주소: ',
              size: 22,
              font: FONT_KR,
              bold: true,
              color: C.dark,
            }),
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: 'https://pepick.netlify.app',
                  size: 22,
                  font: FONT_KR,
                  color: C.primary,
                  underline: {},
                }),
              ],
              link: 'https://pepick.netlify.app',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: '사용 환경: 스마트폰, 태블릿, PC 모두 가능 (크롬 브라우저 권장)',
              size: 18,
              font: FONT_KR,
              color: C.gray,
            }),
          ],
        }),

        // ===== 주요 기능 한눈에 보기 =====
        hr(),
        h1('주요 기능 한눈에 보기'),
        new Table({
          columnWidths: [1600, 4200, 3560],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                headerCell('기능', 1600),
                headerCell('설명', 4200),
                headerCell('수업 활용', 3560),
              ],
            }),
            new TableRow({
              children: [
                boldDataCell('술래뽑기', '', 1600),
                dataCell('학생 중 술래/천사를 랜덤 선정 + 타이머', 4200),
                dataCell('술래잡기, 무궁화꽃, 얼음땡 등', 3560),
              ],
            }),
            new TableRow({
              children: [
                boldDataCell('모둠뽑기', '', 1600),
                dataCell('학생들을 N개 모둠으로 랜덤/고정 배정 + 타이머', 4200),
                dataCell('모둠 경기, 릴레이, 협동 활동 등', 3560),
              ],
            }),
            new TableRow({
              children: [
                boldDataCell('배지도감', '', 1600),
                dataCell('인성 배지 10종 수여 + 레벨 시스템 + 학급 온도계', 4200),
                dataCell('인성 교육, 공정한 경쟁, 동기 부여', 3560),
              ],
            }),
            new TableRow({
              children: [
                boldDataCell('만능 휘슬', '', 1600),
                dataCell('3가지 모드(꾹/길게/삐삐삐) 호루라기 소리', 4200),
                dataCell('호루라기 없을 때, 실내 수업 시', 3560),
              ],
            }),
            new TableRow({
              children: [
                boldDataCell('퀵 타이머', '', 1600),
                dataCell('프리셋(30초~5분) 또는 직접 입력 카운트다운', 4200),
                dataCell('게임 시간 관리, 활동 시간 제한', 3560),
              ],
            }),
            new TableRow({
              children: [
                boldDataCell('학급 관리', '', 1600),
                dataCell('여러 학급의 학생 명단 저장 + 클라우드 동기화', 4200),
                dataCell('학급별 세팅 저장, 기기 변경 시 유지', 3560),
              ],
            }),
          ],
        }),

        // ===== 화면 구성 =====
        hr(),
        h1('화면 구성'),
        p('학급을 선택하면 상단 네비바에 4개 탭이 표시됩니다:'),
        spacer(40),
        new Table({
          columnWidths: [2400, 6960],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [headerCell('탭', 2400), headerCell('기능', 6960)],
            }),
            new TableRow({
              children: [boldDataCell('술래뽑기', '', 2400), dataCell('술래/천사 랜덤 선정', 6960)],
            }),
            new TableRow({
              children: [boldDataCell('모둠뽑기', '', 2400), dataCell('모둠(팀) 배정', 6960)],
            }),
            new TableRow({
              children: [boldDataCell('배지도감', '', 2400), dataCell('인성 배지 관리', 6960)],
            }),
            new TableRow({
              children: [boldDataCell('학급관리', '', 2400), dataCell('학급 설정/편집', 6960)],
            }),
          ],
        }),
        spacer(40),
        tipBox('모바일: 상단 우측 햄버거 메뉴(\u2630)를 터치하면 좌측 슬라이드 메뉴가 열립니다.'),

        h2('우측 도구 툴바'),
        p('화면 우측에 세로로 배치된 도구 툴바에서 자주 쓰는 기능에 바로 접근할 수 있습니다:'),
        spacer(40),
        new Table({
          columnWidths: [2400, 6960],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [headerCell('버튼', 2400), headerCell('기능', 6960)],
            }),
            new TableRow({
              children: [
                boldDataCell('학급 선택', '', 2400),
                dataCell('학급 목록으로 돌아가기', 6960),
              ],
            }),
            new TableRow({
              children: [boldDataCell('로그아웃', '', 2400), dataCell('계정 로그아웃', 6960)],
            }),
            new TableRow({
              children: [
                boldDataCell('배지 수여', '', 2400),
                dataCell('학생에게 즉석 배지 부여', 6960),
              ],
            }),
            new TableRow({
              children: [boldDataCell('온도계', '', 2400), dataCell('학급 온도계 바로가기', 6960)],
            }),
            new TableRow({
              children: [boldDataCell('타이머', '', 2400), dataCell('퀵 타이머 패널 열기', 6960)],
            }),
            new TableRow({
              children: [boldDataCell('휘슬', '', 2400), dataCell('만능 휘슬 패널 열기', 6960)],
            }),
          ],
        }),
        spacer(40),
        tipBox(
          '툴바 하단의 접기/펼치기 버튼으로 아이콘만 보이게 축소하거나 텍스트 포함으로 확장할 수 있습니다.'
        ),

        // ===== 시작하기 =====
        new Paragraph({ children: [new PageBreak()] }),
        h1('시작하기 (최초 1회, 약 3분)'),

        h2('1단계: 로그인'),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: 'https://pepick.netlify.app',
                  size: 20,
                  font: FONT_KR,
                  color: C.primary,
                  underline: {},
                }),
              ],
              link: 'https://pepick.netlify.app',
            }),
            new TextRun({ text: ' 접속', size: 20, font: FONT_KR }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            pBold('구글 계정으로 로그인', ' (학교 구글 계정 또는 개인 계정)').children,
          ].flat(),
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({
              text: '로그인하면 학급 데이터가 클라우드에 자동 저장 \u2192 다른 기기에서도 동일하게 사용 가능',
              size: 20,
              font: FONT_KR,
            }),
          ],
        }),

        h2('2단계: 학급 설정 위저드'),
        p('처음 로그인하면 학급 설정 마법사가 자동으로 시작됩니다.'),
        ...[
          '학교급 선택: 초등학교 / 중학교 / 고등학교',
          '담당 학년 선택: 복수 선택 가능 (예: 3학년, 4학년)',
          '학년별 반 수 설정: +/- 버튼으로 조절',
          '학급별 학생 수 조정: 기본 20명, 학급별 실제 인원에 맞게 조정',
          '선생님 이름 입력: 앱에 표시될 이름 (선택사항, 건너뛰기 가능)',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-wizard', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),
        spacer(40),
        tipBox('위저드를 완료하면 모든 학급이 자동 생성됩니다!'),

        h2('3단계: 학급 선택'),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({
              text: '학급 목록에서 수업할 학급을 탭하면 바로 술래뽑기 화면으로 이동',
              size: 20,
              font: FONT_KR,
            }),
          ],
        }),

        // ===== 기능별 상세 사용법 =====
        hr(),
        h1('기능별 상세 사용법'),

        // -- 1. 술래뽑기 --
        h2('1. 술래뽑기'),
        p('수업 중 술래, 천사, 시범자 등을 랜덤으로 뽑을 때 사용합니다.'),
        h3('설정 방법'),
        ...[
          '상단 탭에서 술래뽑기 선택',
          '뽑기 설정: 술래 수(1~10명), 천사 수(0~10명), 분/초 타이머 시간',
          '뽑을 학생 설정: 학급 불러오기 / 번호순 생성 / 성별 구분',
          '학생 카드를 탭하면 제외/포함 토글 (결석생, 부상자 제외)',
          '술래 뽑기! 버튼 터치',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-tag', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),
        h3('결과 화면'),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [new TextRun({ text: '술래와 천사가 카드로 표시됨', size: 20, font: FONT_KR })],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            pBold('게임 시작', ' \u2192 전체화면 타이머 시작 (종료 시 알림음)').children,
          ].flat(),
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [pBold('다시뽑기', ' \u2192 동일 설정으로 다시 랜덤 뽑기').children].flat(),
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            pBold('중복 제외 ON', ' \u2192 이전에 뽑혔던 학생은 자동 제외 (공평하게 돌아가며 뽑기)')
              .children,
          ].flat(),
        }),

        // -- 2. 모둠뽑기 --
        h2('2. 모둠뽑기'),
        p('학생들을 여러 모둠(팀)으로 나눌 때 사용합니다.'),
        h3('설정 방법'),
        ...[
          '상단 탭에서 모둠뽑기 선택',
          '뽑기 모드 선택: 랜덤(매번 새로 배정) / 고정(미리 편성한 모둠)',
          '뽑기 설정: 모둠당 인원(2~10명), 모둠 개수(1~12개), 분/초 타이머',
          '모둠 이름 설정: 숫자순 / 학급 설정 이름 / 즉석 커스텀',
          '뽑을 학생 설정: 학급 불러오기 / 번호순 / 성별 구분',
          '모둠 뽑기! 버튼 터치',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-group', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),
        h3('결과 화면'),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({ text: '각 모둠별로 배정된 학생 카드 표시', size: 20, font: FONT_KR }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({
              text: '남는 학생/부족한 학생이 있으면 자동 안내 팝업',
              size: 20,
              font: FONT_KR,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [pBold('타이머', ' \u2192 활동 시간 타이머 (전체화면 가능)').children].flat(),
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [pBold('다시뽑기', ' \u2192 같은 설정으로 재배정').children].flat(),
        }),

        // -- 3. 배지도감 --
        new Paragraph({ children: [new PageBreak()] }),
        h2('3. 배지도감'),
        p(
          '수업 중 학생들에게 인성 배지를 부여하고, 학급 전체의 성장을 시각적으로 확인할 수 있는 기능입니다.'
        ),

        h3('인성 배지 10종'),
        new Table({
          columnWidths: [2000, 7360],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [headerCell('배지', 2000), headerCell('설명', 7360)],
            }),
            ...[
              ['협동', '친구와 합심하여 미션/경기 진행 시 부여'],
              ['존중', '친구의 의견을 존중할 경우 부여'],
              ['배려', '친구를 배려한 경기 진행 시 부여'],
              ['안전', '무리하지 않고 안전하게 경기 진행 시 부여'],
              ['리더십', '친구들을 잘 이끌어 미션/경기 진행 시 부여'],
              ['팀워크', '여러 명이서 기지를 발휘했을 때 부여'],
              ['페어플레이', '공정하게 경기의 규칙을 준수 시 부여'],
              ['승리', '게임에서 최종 승리 시 부여'],
              ['도전', '본인 목표와 어려운 과제에 도전할 시 부여'],
              ['긍정', '밝은 모습으로 활동에 참여할 시 부여'],
            ].map(
              ([badge, desc]) =>
                new TableRow({ children: [boldDataCell(badge, '', 2000), dataCell(desc, 7360)] })
            ),
          ],
        }),

        h3('배지 부여 방법'),
        ...[
          '배지도감 탭 \u2192 상단의 부여 버튼 터치',
          '또는 우측 툴바의 배지 수여 버튼으로 빠르게 접근',
          '배지 종류 선택 \u2192 부여할 학생 선택 \u2192 완료',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-badge-award', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),

        h3('개인 배지 탭'),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({
              text: '학생별 카드로 보유 배지 현황 한눈에 확인',
              size: 20,
              font: FONT_KR,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({
              text: '학생 카드를 터치하면 상세 모달: 배지 종류별 보유 개수 + 레벨 확인',
              size: 20,
              font: FONT_KR,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            pBold('레벨 시스템: ', '배지를 모을수록 레벨 UP (배지 1개 = 10 XP)').children,
          ].flat(),
        }),
        spacer(40),
        new Table({
          columnWidths: [1800, 2400, 2400, 2760],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                headerCell('레벨', 1800),
                headerCell('이름', 2400),
                headerCell('필요 XP', 2400),
                headerCell('배지 수 환산', 2760),
              ],
            }),
            ...[
              ['Lv.1', '새싹', '0', '-'],
              ['Lv.2', '새싹+', '30', '3개'],
              ['Lv.3', '성장', '80', '8개'],
              ['Lv.4', '성장+', '160', '16개'],
              ['Lv.5', '도약', '280', '28개'],
              ['Lv.6', '도약+', '440', '44개'],
              ['Lv.7', '빛남', '650', '65개'],
              ['Lv.8', '빛남+', '920', '92개'],
              ['Lv.9', '전설', '1,250', '125개'],
              ['Lv.10', '체육왕', '1,650', '165개'],
            ].map(
              ([lv, name, xp, cnt]) =>
                new TableRow({
                  children: [
                    dataCell(lv, 1800, { bold: true }),
                    dataCell(name, 2400),
                    dataCell(xp, 2400),
                    dataCell(cnt, 2760, { color: C.gray }),
                  ],
                })
            ),
          ],
        }),

        h3('학급 통계 탭'),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            pBold('학급 온도계: ', '학급 전체가 모은 배지 수에 따라 온도가 올라갑니다').children,
          ].flat(),
        }),
        new Paragraph({
          numbering: { reference: 'bullet-indent', level: 0 },
          children: [
            new TextRun({ text: '기본 목표: 배지 200개 = 100\u00B0C', size: 20, font: FONT_KR }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-indent', level: 0 },
          children: [
            new TextRun({
              text: '마일스톤 보상: 온도별 보상 설정 가능 (예: 20\u00B0C \u2192 야외 수업, 60\u00B0C \u2192 과자파티)',
              size: 20,
              font: FONT_KR,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet-indent', level: 0 },
          children: [
            new TextRun({
              text: '설정 버튼으로 목표 배지 수와 마일스톤 보상을 직접 편집 가능',
              size: 20,
              font: FONT_KR,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            pBold('배지 타입별 통계: ', '어떤 배지가 가장 많이 부여되었는지 확인').children,
          ].flat(),
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [pBold('학생별 TOP 5: ', '배지를 가장 많이 모은 학생 순위').children].flat(),
        }),

        // -- 4. 만능 휘슬 --
        h2('4. 만능 휘슬'),
        p('우측 도구 툴바의 휘슬 버튼을 누르면 휘슬 패널이 열립니다.'),
        spacer(40),
        new Table({
          columnWidths: [2400, 3480, 3480],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                headerCell('모드', 2400),
                headerCell('소리', 3480),
                headerCell('활용', 3480),
              ],
            }),
            new TableRow({
              children: [
                boldDataCell('꾹 누르기', '', 2400),
                dataCell('누르는 동안 계속 소리', 3480),
                dataCell('짧은 신호, 주의 집중', 3480),
              ],
            }),
            new TableRow({
              children: [
                boldDataCell('길게 삐\u2014\u2014\u2014', '', 2400),
                dataCell('한번 탭으로 긴 소리', 3480),
                dataCell('게임 시작/종료 신호', 3480),
              ],
            }),
            new TableRow({
              children: [
                boldDataCell('삐삐삐!', '', 2400),
                dataCell('3연속 짧은 소리', 3480),
                dataCell('긴급 정지, 집합 신호', 3480),
              ],
            }),
          ],
        }),
        spacer(40),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({ text: '볼륨 슬라이더로 소리 크기 조절 가능', size: 20, font: FONT_KR }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({
              text: '타이머 전체화면에서도 휘슬 버튼 사용 가능',
              size: 20,
              font: FONT_KR,
            }),
          ],
        }),

        // -- 5. 퀵 타이머 --
        h2('5. 퀵 타이머'),
        p('우측 도구 툴바의 타이머 버튼을 누르면 퀵 타이머 패널이 열립니다.'),
        p('뽑기 화면을 거치지 않고 어디서든 바로 타이머를 사용할 수 있습니다.'),
        h3('사용 방법'),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            pBold('프리셋 버튼: ', '30초, 1분, 3분, 5분 중 선택하면 즉시 전체화면 타이머 시작')
              .children,
          ].flat(),
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            pBold('직접 입력: ', '분/초를 +/- 버튼으로 조절 후 타이머 시작 터치').children,
          ].flat(),
        }),
        h3('타이머 기능'),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            pBold('전체화면 모드: ', '큰 숫자로 표시 \u2192 학생들도 멀리서 볼 수 있음').children,
          ].flat(),
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [new TextRun({ text: '일시정지/재개 가능', size: 20, font: FONT_KR })],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [new TextRun({ text: '종료 시 알림음 자동 재생', size: 20, font: FONT_KR })],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({ text: '전체화면에서도 휘슬 버튼 사용 가능', size: 20, font: FONT_KR }),
          ],
        }),
        spacer(40),
        tipBox('술래뽑기/모둠뽑기 결과 화면에서도 각각 타이머를 시작할 수 있습니다.'),

        // -- 6. 학급 관리 --
        h2('6. 학급 관리'),
        p('상단 탭의 학급관리에서 현재 학급의 상세 정보를 관리합니다.'),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [pBold('학생 목록: ', '편집 버튼으로 학생 추가/삭제/수정').children].flat(),
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            pBold('모둠 설정: ', '고정 모둠 편성 (모둠뽑기 "고정" 모드에서 사용)').children,
          ].flat(),
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [pBold('표시 이름: ', '선생님 이름 변경').children].flat(),
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [pBold('데이터 초기화: ', '전체 데이터 삭제 (신학기 리셋용)').children].flat(),
        }),
        h3('학급 전환'),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({
              text: '우측 툴바의 학급 선택 버튼 \u2192 학급 목록으로 이동 \u2192 다른 학급 선택',
              size: 20,
              font: FONT_KR,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({
              text: '매 차시 학급만 바꾸면 세팅 그대로 사용 가능',
              size: 20,
              font: FONT_KR,
            }),
          ],
        }),

        // ===== 실제 수업 시나리오 =====
        new Paragraph({ children: [new PageBreak()] }),
        h1('실제 수업 시나리오'),

        h2('시나리오 1: 술래잡기 (초등 3~4학년)'),
        tipBox('상황: 운동장에서 술래잡기. 학생 25명, 술래 2명, 천사 1명.'),
        ...[
          'PEPick 앱 열기 \u2192 해당 학급 선택',
          '술래뽑기 탭 \u2192 술래 수 2, 천사 수 1, 타이머 3분 00초',
          '학급 불러오기로 학생 명단 로드 \u2192 결석생 카드 탭해서 제외',
          '술래 뽑기! 터치 \u2192 결과 확인',
          '"오늘 술래는 OOO, OOO! 천사는 OOO!"',
          '게임 시작 \u2192 전체화면 타이머 작동',
          '3분 후 알림음 \u2192 라운드 종료',
          '우측 툴바 휘슬로 집합 신호',
          '다시뽑기로 2라운드 시작 (중복 제외 ON이면 이전 술래는 자동 제외)',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-s1', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),

        h2('시나리오 2: 모둠 축구 / 피구 (초등 5~6학년)'),
        tipBox('상황: 체육관에서 모둠 피구. 학생 28명, 4팀으로 나누기.'),
        ...[
          'PEPick 앱 열기 \u2192 해당 학급 선택',
          '모둠뽑기 탭 \u2192 모둠당 인원 7, 모둠 개수 4',
          '모둠 이름 즉석 커스텀 \u2192 "파랑팀, 빨강팀, 노랑팀, 초록팀" 입력',
          '학급 불러오기 \u2192 결석생 제외',
          '모둠 뽑기! \u2192 결과 확인',
          '학생들에게 결과 화면 보여주기 (큰 글자로 한눈에 확인)',
          '타이머 \u2192 5분 프리셋 선택 \u2192 전체화면으로 경기 시작',
          '시간 종료 \u2192 휘슬 삐삐삐로 경기 종료 알림',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-s2', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),

        h2('시나리오 3: 협동 줄넘기 릴레이 (중학교)'),
        tipBox('상황: 6개 모둠이 릴레이 줄넘기. 고정 모둠 사용.'),
        ...[
          '학급관리에서 미리 6개 모둠 편성해 두기 (한번만 하면 됨)',
          '모둠뽑기 \u2192 고정 모드 선택 \u2192 모둠 순서 섞기 ON',
          '모둠 뽑기! \u2192 순서가 섞인 고정 모둠 표시',
          '"1번째 도전: OO모둠! 준비~"',
          '타이머 1분 \u2192 전체화면 \u2192 시작',
          '휘슬로 신호 \u2192 다음 모둠 도전',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-s3', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),

        h2('시나리오 4: 준비 운동 시간 제한'),
        tipBox('상황: 수업 시작, 5분 준비 운동 시간.'),
        ...[
          '우측 툴바 휘슬 \u2192 길게 삐\u2014\u2014\u2014 선택 \u2192 터치 \u2192 준비 운동 시작 신호',
          '우측 툴바 타이머 \u2192 5분 프리셋 터치 \u2192 전체화면 카운트다운 시작',
          '5분 후 알림 \u2192 휘슬 삐삐삐로 집합',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-s4', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),

        h2('시나리오 5: 모둠 피구 후 인성 배지 수여 (초등 5~6학년)'),
        tipBox('상황: 모둠 피구 경기 종료 후, 잘한 학생들에게 배지 부여.'),
        ...[
          '경기 종료 후 우측 툴바 배지 수여 버튼 터치',
          '페어플레이 배지 선택 \u2192 규칙을 잘 지킨 학생들 터치 \u2192 완료',
          '승리 배지 선택 \u2192 이긴 팀 학생들 터치 \u2192 완료',
          '배지도감 탭 \u2192 학급 통계 \u2192 온도계 확인',
          '"우와! 우리 반 온도가 40\u00B0C 넘었네! 자유시간 2분 보상!"',
          '학생들이 자연스럽게 인성 덕목을 의식하며 경기에 참여하게 됩니다',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-s5', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),

        h2('시나리오 6: 학기 초 학급 목표 세우기'),
        tipBox('상황: 학기 초, 학급 온도계 마일스톤 보상을 학생들과 함께 설정.'),
        ...[
          '배지도감 탭 \u2192 학급 통계 \u2192 온도계의 설정 버튼 터치',
          '100\u00B0C 기준 배지 수 설정 (예: 300개)',
          '마일스톤 보상을 학생들과 함께 결정',
          '저장 \u2192 매 수업 배지 부여 후 온도계 함께 확인',
          '학급 전체의 공동 목표가 생겨 자연스러운 동기 부여!',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-s6', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),

        // ===== 홈 화면에 추가하기 =====
        new Paragraph({ children: [new PageBreak()] }),
        h1('홈 화면에 추가하기 (앱처럼 사용)'),
        p('설치 없이 홈 화면에 아이콘을 추가하면 앱처럼 바로 실행할 수 있습니다.'),

        h2('iPhone / iPad \u2014 Safari'),
        ...[
          'Safari로 https://pepick.netlify.app 접속',
          '하단 중앙의 공유 버튼 (네모에서 화살표 나오는 아이콘) 터치',
          '아래로 스크롤 \u2192 "홈 화면에 추가" 터치',
          '이름 확인 후 우측 상단 "추가" 터치',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-safari', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),

        h2('iPhone / iPad \u2014 Chrome'),
        ...[
          'Chrome으로 https://pepick.netlify.app 접속',
          '상단의 공유 버튼 (네모에서 화살표 나오는 아이콘) 터치',
          '"더보기" 터치',
          '"홈 화면에 추가" 터치',
          '이름 확인 후 "추가" 터치',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-chrome-ios', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),

        h2('Android (Chrome)'),
        ...[
          'Chrome으로 https://pepick.netlify.app 접속',
          '우측 상단 점 세 개 메뉴 (\u22EE) 터치',
          '"홈 화면에 추가" 또는 "앱 설치" 터치',
          '이름 확인 후 "추가" 터치',
          '홈 화면에 PEPick 아이콘이 생성됩니다',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'num-android', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),

        spacer(40),
        tipBox(
          'Android에서는 접속 시 하단에 "앱 설치" 배너가 자동으로 뜰 수도 있습니다. 배너가 뜨면 바로 터치하면 됩니다!'
        ),

        h3('홈 화면 추가 후 장점'),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({
              text: '브라우저 주소창 없이 전체 화면으로 실행',
              size: 20,
              font: FONT_KR,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({ text: '홈 화면에서 한번 터치로 바로 접속', size: 20, font: FONT_KR }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({
              text: '로그인 상태가 유지되어 매번 로그인할 필요 없음',
              size: 20,
              font: FONT_KR,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullet', level: 0 },
          children: [
            new TextRun({ text: '오프라인에서도 기본 기능 사용 가능', size: 20, font: FONT_KR }),
          ],
        }),

        // ===== FAQ =====
        hr(),
        h1('자주 묻는 질문 (FAQ)'),
        ...[
          [
            'Q. 데이터가 날아가지 않나요?',
            '구글 로그인 상태에서는 클라우드(Firestore)에 자동 저장됩니다. 핸드폰을 바꿔도 같은 구글 계정으로 로그인하면 데이터가 그대로 있어요.',
          ],
          [
            'Q. 인터넷이 안 되는 운동장에서도 쓸 수 있나요?',
            '한번 접속한 뒤에는 오프라인에서도 기본 기능(뽑기, 타이머, 휘슬)이 동작합니다. 다만 학급 데이터 동기화는 온라인일 때만 됩니다.',
          ],
          [
            'Q. 학생 명단을 매번 입력해야 하나요?',
            '아닙니다! 처음에 위저드로 학급을 세팅하면, 이후에는 학급 불러오기 한번이면 끝입니다. 학급관리에서 학생 이름도 수정 가능해요.',
          ],
          [
            'Q. 다른 선생님과 데이터가 공유되나요?',
            '아닙니다. 각자 구글 계정에 독립적으로 저장되어 다른 사람의 데이터와 완전히 분리됩니다.',
          ],
          [
            'Q. 앱 설치가 필요한가요?',
            '설치 없이 크롬 브라우저로 접속하면 됩니다. 자주 쓴다면 "홈 화면에 추가"로 앱처럼 아이콘을 만들 수도 있어요.',
          ],
          [
            'Q. 배지 데이터도 클라우드에 저장되나요?',
            '네! 배지 데이터도 구글 로그인 상태에서는 Firestore에 자동 저장됩니다. 기기를 바꿔도 배지 기록이 유지됩니다.',
          ],
          [
            'Q. 학급 온도계 보상은 어떻게 바꾸나요?',
            '배지도감 \u2192 학급 통계 \u2192 온도계의 설정 버튼을 터치하면 목표 배지 수와 마일스톤별 보상을 직접 편집할 수 있습니다.',
          ],
        ].flatMap(([q, a]) => [
          new Paragraph({
            spacing: { before: 200, after: 40 },
            children: [
              new TextRun({ text: q, size: 20, font: FONT_KR, bold: true, color: C.dark }),
            ],
          }),
          tipBox(a),
        ]),

        // ===== 피드백 =====
        hr(),
        h1('피드백 부탁드립니다!'),
        p('사용해 보시고 아래 내용 알려주시면 큰 도움이 됩니다:'),
        ...[
          '처음 세팅(위저드)이 직관적이었나요?',
          '실제 수업 중에 조작이 편리했나요?',
          '오류나 멈춤 현상이 있었나요?',
          '있었으면 좋겠다 싶은 기능이 있나요?',
          '화면이 보기 편했나요? (글자 크기, 색상, 배치 등)',
        ].map(
          t =>
            new Paragraph({
              numbering: { reference: 'bullet', level: 0 },
              children: [new TextRun({ text: t, size: 20, font: FONT_KR })],
            })
        ),
        spacer(80),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: '어떤 피드백이든 환영합니다. 감사합니다!',
              size: 22,
              font: FONT_KR,
              bold: true,
              color: C.primary,
            }),
          ],
        }),
        spacer(40),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: '문의: pepick.help@gmail.com',
              size: 18,
              font: FONT_KR,
              color: C.gray,
            }),
          ],
        }),
      ],
    },
  ],
});

// ── 파일 생성 ──
const outPath = __dirname + '/PEPick_사용가이드.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log('생성 완료:', outPath);
});
