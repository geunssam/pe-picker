/**
 * 학급 데이터 Firestore 동기화
 */
import { Store } from '../shared/store.js';
import {
  getGoogleSyncContext,
  normalizeStudentName,
  normalizeGroupMembers,
  encodeGroupsForFirestore,
  extractGradeFromClassName,
  sortStudentsByNumber,
  sanitizeGender,
} from './helpers.js';
import { getGroupIndexByStudentName } from './modal-editor.js';

export async function syncClassToFirestore(classId) {
  const context = getGoogleSyncContext();
  if (!context) return;

  const { user, db } = context;
  const cls = Store.getClassById(classId);
  if (!cls) return;

  const classRef = db.collection('users').doc(user.uid).collection('classes').doc(classId);
  const userRef = db.collection('users').doc(user.uid);

  const normalizedStudents = (cls.students || [])
    .map((student, index) => {
      const name = normalizeStudentName(student);
      if (!name) return null;

      const numberRaw = typeof student === 'object' ? parseInt(student.number, 10) : NaN;

      return {
        name,
        number: Number.isFinite(numberRaw) && numberRaw > 0 ? numberRaw : index + 1,
        gender: typeof student === 'object' ? sanitizeGender(student.gender) : '',
        sportsAbility:
          typeof student === 'object' && typeof student.sportsAbility === 'string'
            ? student.sportsAbility
            : '',
        tags: typeof student === 'object' && Array.isArray(student.tags) ? student.tags : [],
        note: typeof student === 'object' && typeof student.note === 'string' ? student.note : '',
      };
    })
    .filter(Boolean)
    .sort(sortStudentsByNumber)
    .map((student, idx) => ({ ...student, number: idx + 1 }));

  const groups = normalizeGroupMembers(cls.groups || []);
  const groupsForFirestore = encodeGroupsForFirestore(groups);
  const groupCount = cls.groupCount || (groups.length > 0 ? groups.length : 6);
  const groupNames =
    Array.isArray(cls.groupNames) && cls.groupNames.length > 0
      ? cls.groupNames
      : Store.getDefaultGroupNames().slice(0, groupCount);

  const existingStudents = await classRef.collection('students').get();
  const batch = db.batch();

  batch.set(
    classRef,
    {
      name: cls.name,
      year: new Date().getFullYear(),
      grade: extractGradeFromClassName(cls.name),
      studentCount: normalizedStudents.length,
      groupNames,
      groups: groupsForFirestore,
      groupCount,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  existingStudents.forEach(doc => batch.delete(doc.ref));

  normalizedStudents.forEach(student => {
    const studentRef = classRef
      .collection('students')
      .doc(`student-${String(student.number).padStart(3, '0')}`);
    batch.set(studentRef, {
      name: student.name,
      number: student.number,
      gender: student.gender,
      sportsAbility: student.sportsAbility,
      tags: student.tags,
      note: student.note,
      groupIndex: getGroupIndexByStudentName(groups, student.name),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  });

  if (Store.getSelectedClassId() === classId) {
    batch.set(
      userRef,
      {
        selectedClassId: classId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
}

export async function deleteClassFromFirestore(classId, selectedWasDeleted) {
  const context = getGoogleSyncContext();
  if (!context) return;

  const { user, db } = context;
  const userRef = db.collection('users').doc(user.uid);
  const classRef = userRef.collection('classes').doc(classId);

  const existingStudents = await classRef.collection('students').get();
  const batch = db.batch();

  existingStudents.forEach(doc => batch.delete(doc.ref));
  batch.delete(classRef);

  if (selectedWasDeleted) {
    batch.set(
      userRef,
      {
        selectedClassId: null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
}
