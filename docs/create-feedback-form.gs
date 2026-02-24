/**
 * PEPick! 사용자 피드백 설문 — Google Forms 자동 생성 스크립트
 *
 * 사용법:
 *   1. https://script.google.com 접속
 *   2. 새 프로젝트 생성
 *   3. 이 코드 전체를 붙여넣기
 *   4. ▶ 실행 (createPEPickFeedbackForm)
 *   5. 권한 승인 → 실행 로그에서 폼 URL 확인
 */

function createPEPickFeedbackForm() {
  const form = FormApp.create('PEPick! 사용자 피드백 설문');
  form.setDescription(
    'PEPick! 체육 수업 도우미를 사용해 주셔서 감사합니다.\n' +
    '더 나은 서비스를 위해 소중한 의견을 남겨 주세요. (약 3~5분 소요)\n\n' +
    '※ 본 설문은 익명으로 진행되며, 수집된 정보는 서비스 개선 목적으로만 사용됩니다.'
  );
  form.setConfirmationMessage(
    '소중한 의견 감사합니다! 🙏\nPEPick!이 더 좋은 체육 수업 도우미가 되도록 노력하겠습니다.'
  );
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(true);

  // ============================================================
  // 섹션 1: 개인정보 수집·이용 동의
  // ============================================================
  form.addSectionHeaderItem()
    .setTitle('개인정보 수집·이용 동의')
    .setHelpText(
      '본 설문에서는 서비스 개선을 위해 아래와 같이 개인정보를 수집합니다.\n\n' +
      '■ 수집 항목: 학교급, 담당 학년, 이메일(선택)\n' +
      '■ 수집 목적: 사용자 유형별 피드백 분석, 후속 안내 발송(이메일 제공 시)\n' +
      '■ 보유 기간: 수집일로부터 1년 후 파기\n' +
      '■ 동의를 거부할 권리가 있으며, 거부 시 설문 참여가 제한될 수 있습니다.\n\n' +
      '자세한 내용은 PEPick! 개인정보처리방침을 참고해 주세요.'
    );

  var consentItem = form.addMultipleChoiceItem()
    .setTitle('위 개인정보 수집·이용에 동의하십니까?')
    .setRequired(true);

  // 동의하지 않으면 설문 종료 페이지로 이동
  var endPage = form.addPageBreakItem()
    .setTitle('설문 종료');

  // 종료 안내 (동의 거부 시)
  form.addSectionHeaderItem()
    .setTitle('설문에 참여해 주셔서 감사합니다')
    .setHelpText(
      '개인정보 수집에 동의하지 않으셔도 괜찮습니다.\n' +
      '서비스 이용에는 영향이 없습니다. 감사합니다!'
    );

  // 동의 시 다음 페이지로 진행
  var basicInfoPage = form.addPageBreakItem()
    .setTitle('기본 정보');

  consentItem.setChoices([
    consentItem.createChoice('동의합니다', basicInfoPage),
    consentItem.createChoice('동의하지 않습니다', endPage),
  ]);

  // endPage에서 폼 제출로 이동
  endPage.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  // ============================================================
  // 섹션 2: 기본 정보
  // ============================================================
  basicInfoPage.setHelpText('선생님의 교육 환경에 대해 간단히 알려 주세요.');

  form.addMultipleChoiceItem()
    .setTitle('학교급')
    .setChoiceValues(['초등학교', '중학교', '고등학교', '기타'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('담당 학년 (복수 담당 시 주 담당 학년)')
    .setChoiceValues(['1~2학년', '3~4학년', '5~6학년', '중등', '고등', '기타'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('체육 수업 담당 형태')
    .setChoiceValues(['담임 겸 체육', '체육 전담', '기간제/강사', '기타'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('PEPick! 사용 기간')
    .setChoiceValues(['오늘 처음 사용', '1주 미만', '1주~1개월', '1개월 이상'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('주로 사용하는 기기')
    .setChoiceValues(['스마트폰', '태블릿', '노트북/데스크톱', '여러 기기 혼용'])
    .setRequired(true);

  // ============================================================
  // 섹션 3: 기능 평가
  // ============================================================
  form.addPageBreakItem()
    .setTitle('기능 평가')
    .setHelpText('PEPick!의 각 기능에 대한 만족도를 평가해 주세요.');

  form.addScaleItem()
    .setTitle('술래뽑기 기능 만족도')
    .setHelpText('뽑기 결과의 공정성, 옵션 다양성 등')
    .setBounds(1, 5)
    .setLabels('매우 불만족', '매우 만족')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('모둠뽑기 기능 만족도')
    .setHelpText('모둠 구성 방식, 고정 모둠, 남는/부족 학생 처리 등')
    .setBounds(1, 5)
    .setLabels('매우 불만족', '매우 만족')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('배지/보상 시스템 만족도')
    .setHelpText('배지 부여, XP, 배지도감 등')
    .setBounds(1, 5)
    .setLabels('매우 불만족', '매우 만족')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('학급 관리 기능 만족도')
    .setHelpText('학생 등록, CSV 가져오기, 모둠 편집 등')
    .setBounds(1, 5)
    .setLabels('매우 불만족', '매우 만족')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('타이머 기능 만족도')
    .setHelpText('타이머 프리셋, 전체화면 모드 등')
    .setBounds(1, 5)
    .setLabels('매우 불만족', '매우 만족')
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('가장 자주 사용하는 기능은? (복수 선택 가능)')
    .setChoiceValues([
      '술래뽑기',
      '모둠뽑기',
      '타이머',
      '배지/보상',
      '학급 관리',
      '휘슬',
    ])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('추가로 필요한 기능이 있다면 자유롭게 작성해 주세요')
    .setRequired(false);

  // ============================================================
  // 섹션 4: UI/디자인 평가
  // ============================================================
  form.addPageBreakItem()
    .setTitle('UI / 디자인 평가')
    .setHelpText('PEPick!의 화면 구성과 디자인에 대해 평가해 주세요.');

  form.addScaleItem()
    .setTitle('전반적인 디자인 만족도')
    .setHelpText('색상, 레이아웃, 폰트 등 시각적 완성도')
    .setBounds(1, 5)
    .setLabels('매우 불만족', '매우 만족')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('화면 구성의 직관성')
    .setHelpText('원하는 기능을 쉽게 찾을 수 있는지')
    .setBounds(1, 5)
    .setLabels('매우 어려움', '매우 쉬움')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('뽑기 결과 화면의 가독성')
    .setHelpText('결과가 한눈에 잘 보이는지')
    .setBounds(1, 5)
    .setLabels('매우 불만족', '매우 만족')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('수업 중 사용 편의성')
    .setHelpText('수업 진행 중 빠르게 조작할 수 있는지')
    .setBounds(1, 5)
    .setLabels('매우 불편', '매우 편리')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('UI/디자인에서 불편하거나 개선이 필요한 부분이 있다면 알려 주세요')
    .setRequired(false);

  // ============================================================
  // 섹션 5: 접근성 평가
  // ============================================================
  form.addPageBreakItem()
    .setTitle('접근성 평가')
    .setHelpText('다양한 환경에서의 사용 경험을 평가해 주세요.');

  form.addScaleItem()
    .setTitle('모바일(스마트폰) 사용 편의성')
    .setHelpText('스마트폰에서 터치 조작, 화면 크기 등')
    .setBounds(1, 5)
    .setLabels('매우 불편', '매우 편리')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('태블릿 사용 편의성')
    .setHelpText('태블릿에서의 레이아웃, 조작성 등')
    .setBounds(1, 5)
    .setLabels('매우 불편', '매우 편리')
    .setRequired(false);

  form.addScaleItem()
    .setTitle('처음 사용할 때 배우기 쉬웠나요?')
    .setHelpText('별도 설명 없이 직관적으로 사용할 수 있었는지')
    .setBounds(1, 5)
    .setLabels('매우 어려움', '매우 쉬움')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('오프라인(와이파이 없는 환경)에서의 안정성')
    .setHelpText('인터넷 없이도 기본 기능이 동작하는지')
    .setBounds(1, 5)
    .setLabels('매우 불안정', '매우 안정')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('로딩 속도는 어떠셨나요?')
    .setChoiceValues(['매우 빠름', '적당함', '약간 느림', '매우 느림'])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('접근성 관련 불편 사항이 있다면 알려 주세요')
    .setHelpText('예: 글자가 작다, 색 구분이 어렵다, 특정 기기에서 안 된다 등')
    .setRequired(false);

  // ============================================================
  // 섹션 6: 가격 및 구독 의향
  // ============================================================
  form.addPageBreakItem()
    .setTitle('가격 및 구독 의향')
    .setHelpText(
      '현재 PEPick!은 무료로 제공되고 있습니다.\n' +
      '향후 프리미엄 기능(고급 통계, 학급 간 공유, 학생 성장 리포트 등) 추가를 검토 중입니다.'
    );

  form.addMultipleChoiceItem()
    .setTitle('유료 구독 또는 앱 구매 의향이 있으신가요?')
    .setChoiceValues([
      '월 구독제라면 이용하겠다',
      '1회 구매(영구 이용)라면 이용하겠다',
      '구독·구매 모두 이용 의향이 있다',
      '무료만 이용하겠다',
      '잘 모르겠다',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('월 구독료는 얼마가 적당하다고 생각하시나요?')
    .setHelpText('프리미엄 기능 포함 기준')
    .setChoiceValues([
      '1,000원 이하',
      '1,000원 ~ 2,000원',
      '2,000원 ~ 3,000원',
      '3,000원 ~ 5,000원',
      '5,000원 이상',
      '무료여야 한다',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('1회 구매(영구 이용)라면 적정 가격은?')
    .setChoiceValues([
      '5,000원 이하',
      '5,000원 ~ 10,000원',
      '10,000원 ~ 20,000원',
      '20,000원 ~ 30,000원',
      '30,000원 이상',
      '1회 구매보다 구독이 낫다',
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('유료로 전환된다면 가장 기대하는 프리미엄 기능은? (복수 선택)')
    .setChoiceValues([
      '학급 간 데이터 공유 (동학년 선생님과)',
      '학생 성장 리포트 (배지/XP 통계)',
      '고급 모둠 알고리즘 (능력별, 성별 균형 등)',
      '수업 기록/일지 자동 생성',
      '학부모 공유용 보고서',
      'AI 활동 추천',
      '광고 제거',
      '클라우드 백업/복원',
    ])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('가격 또는 결제 방식에 대한 의견이 있다면 알려 주세요')
    .setRequired(false);

  // ============================================================
  // 섹션 7: 종합 평가
  // ============================================================
  form.addPageBreakItem()
    .setTitle('종합 평가')
    .setHelpText('PEPick! 전반에 대한 종합 평가를 부탁드립니다.');

  // 별점 (0.5점 간격, 5점 만점) — Google Forms에는 0.5 간격이 없으므로 드롭다운으로 구현
  form.addListItem()
    .setTitle('PEPick! 전체 별점은 몇 점인가요? (5점 만점, 0.5점 간격)')
    .setHelpText('서비스 전반에 대한 종합 만족도')
    .setChoiceValues([
      '★ 0.5점',
      '★ 1.0점',
      '★ 1.5점',
      '★★ 2.0점',
      '★★ 2.5점',
      '★★★ 3.0점',
      '★★★ 3.5점',
      '★★★★ 4.0점',
      '★★★★ 4.5점',
      '★★★★★ 5.0점',
    ])
    .setRequired(true);

  form.addScaleItem()
    .setTitle('다른 선생님에게 PEPick!을 추천하시겠습니까?')
    .setHelpText('NPS: 0 = 절대 추천 안 함, 10 = 적극 추천')
    .setBounds(0, 10)
    .setLabels('절대 추천 안 함', '적극 추천')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('PEPick!을 알게 된 경로는?')
    .setChoiceValues([
      '동료 교사 추천',
      '교사 커뮤니티 (인디스쿨, 참쌤스쿨 등)',
      'SNS (인스타그램, 유튜브 등)',
      '검색 (구글, 네이버 등)',
      '기타',
    ])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('PEPick!에 가장 바라는 점 한 가지를 자유롭게 작성해 주세요')
    .setRequired(false);

  // ============================================================
  // 섹션 8: 추가 의견 / 연락처
  // ============================================================
  form.addPageBreakItem()
    .setTitle('마무리')
    .setHelpText('마지막으로 추가 의견이 있으시면 남겨 주세요.');

  form.addParagraphTextItem()
    .setTitle('기타 의견, 버그 신고, 격려의 말 등 자유롭게 작성해 주세요')
    .setRequired(false);

  form.addTextItem()
    .setTitle('후속 안내를 받으시려면 이메일을 남겨 주세요 (선택)')
    .setHelpText('업데이트 소식, 프리미엄 출시 안내 등을 보내드립니다')
    .setRequired(false);

  // ============================================================
  // 완료 — 로그 출력
  // ============================================================
  var formUrl = form.getPublishedUrl();
  var editUrl = form.getEditUrl();

  Logger.log('=== PEPick! 피드백 설문 생성 완료 ===');
  Logger.log('📋 설문 응답 URL: ' + formUrl);
  Logger.log('✏️ 설문 편집 URL: ' + editUrl);
  Logger.log('');
  Logger.log('위 URL을 복사하여 사용하세요.');

  return { formUrl: formUrl, editUrl: editUrl };
}