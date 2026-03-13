# 술래뽑기/모둠뽑기 학급별 데이터 격리 수정

## Context

학급을 전환하며 수업할 때(3-1 → 3-2 → 2-3), 술래뽑기의 "이미 뽑힌 술래" 이력이 학급 간에 섞이는 치명적 버그.

**증상 3가지:**

1. 학급 B로 전환해도 학급 A의 뽑힌 술래가 이력에 남아있음
2. "새 게임"으로 초기화해도 이력이 사라지지 않음
3. 다시뽑기 시 이미 뽑힌 술래가 재등장

**근본 원인:** `pet_tag_game` 단일 localStorage 키에 모든 학급 데이터가 공유됨.

**해결 방향:** 학급별 localStorage 키 분리 (`pet_tag_game_${classId}`, `pet_current_teams_${classId}`)

---

## 수정 파일 요약

| 파일                                         | Phase    | 설명                           |
| -------------------------------------------- | -------- | ------------------------------ |
| `js/storage/base-repo.js`                    | 1-1      | QuotaExceeded 핸들러           |
| `js/storage/tag-game-repo.js`                | 1-2      | classId 파라미터 추가          |
| `js/storage/group-manager-repo.js`           | 1-3      | classId 파라미터 추가          |
| `js/shared/store.js`                         | 2-1, 2-2 | Facade 시그니처 + 마이그레이션 |
| `js/features/tag-game/tag-game.js`           | 3-1~3-6  | 핵심 버그 수정                 |
| `js/features/group-manager/group-manager.js` | 4-1~4-4  | classId 전달                   |
| `js/features/class/class-modal.js`           | 5-1      | classId 전달                   |

## 진행 상태

- [x] Phase 1: Repository 레이어 (base-repo, tag-game-repo, group-manager-repo)
- [x] Phase 2: Facade 레이어 (store.js)
- [x] Phase 3: 술래뽑기 (tag-game.js)
- [x] Phase 4: 모둠뽑기 (group-manager.js)
- [x] Phase 5: 학급 관리 (class-modal.js)
- [x] Phase 6: 빌드 & 테스트
