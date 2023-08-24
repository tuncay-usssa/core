export {}
const { Firestore } = require('@google-cloud/firestore')
const GoogleCloudAdapter = require('../GoogleCloudAdapter')

const firestore = new Firestore()

type TFirestoreCollection = {
   id: string
}
type TFirestoreDocData = {}
type TFirestoreDocRef = {
   parent: {}
   path: string
}
type TFirestoreDoc = {
   id: string
   data: () => TFirestoreDocData[]
   ref: TFirestoreDocRef
}
type TFirestoreGetDocProps = {
   collection: string
   id: string
   subcollection?: string
   subid?: string
}
type TFirestoreGetDocsProps = {
   collection: string
   id?: string
   subcollection?: string
   subid?: string
   where?: string[]
   orderBy?: string
   limit?: number
   startAt?: {}
}
type TFirestoreGetGroupDocsProps = {
   collection: string
   where?: string[]
   orderBy?: string
   limit?: number
   startAt?: {}
}
type TFirestoreAddDocProps = {
   collection: string
   id?: string
   subcollection?: string
   data: TFirestoreDocData
}
type TFirestoreUpdateDocProps = {
   collection: string
   id: string
   subcollection?: string
   subid?: string
   data: TFirestoreDocData
}
type TFirestoreDeleteDocProps = {
   collection: string
   id: string
   subcollection?: string
   subid?: string
}
type TFirestoreDocsResponse = {
   count: number
   startAt?: {}
   docs: Record<string, unknown>[]
}

module.exports = class FirestoreAdapter extends GoogleCloudAdapter {
   constructor() {
      super()
   }

   async listCollections(collection?: string, id?: string) {
      let result
      try {
         if (collection && id) {
            result = await firestore
               .collection(collection)
               .doc(id)
               .listCollections()
         } else {
            result = await firestore.listCollections()
         }
         return result.map((c: TFirestoreCollection) => c.id)
      } catch (error) {
         // @ts-ignore
         throw new Error(error)
      }
   }

   async getDoc(props: TFirestoreGetDocProps) {
      try {
         let ref = firestore.collection(props.collection).doc(props.id)
         if (props.subcollection && props.subid) {
            ref = ref.collection(props.subcollection).doc(props.subid)
         }
         const result = await ref.get()
         if (result.exists) {
            return { id: props.id, ...result.data() }
         }
         return false
      } catch (error) {
         // @ts-ignore
         throw new Error(error)
      }
   }

   async getDocs(props: TFirestoreGetDocsProps) {
      try {
         console.error('props', JSON.stringify(props))
         let ref = firestore.collection(props.collection)
         if (props.id && props.subcollection) {
            ref = ref.doc(props.id).collection(props.subcollection)
         }

         if (props.where) ref = ref.where(props.where)

         // Require an orderBy for pagination
         if (props.orderBy) ref = ref.orderBy(props.orderBy)

         // Require a limit for pagination
         let limit = 0
         if (props.orderBy) {
            limit = props.limit ?? 1000
            ref = ref.limit(limit ?? 1000)
         }

         // Add startAt for pagination when provided
         if (props.startAt) {
            ref = ref.startAt(props.startAt)
         }

         const snapshot = await ref.get()
         let docs: Record<string, unknown>[] = []
         snapshot.forEach((doc: TFirestoreDoc) => {
            docs.push({ id: doc.id, ...doc.data() })
         })

         let result: TFirestoreDocsResponse = {
            count: snapshot.docs.length,
            docs,
         }
         if (limit && snapshot.docs.length === limit) {
            const last = snapshot.docs[snapshot.docs.length - 1]
            if (props.orderBy) result.startAt = last.data()[props.orderBy]
         }
         return result
      } catch (error) {
         // @ts-ignore
         throw new Error(error)
      }
   }

   async getGroupDocs(props: TFirestoreGetGroupDocsProps) {
      try {
         let ref = firestore.collectionGroup(props.collection)

         if (props.where) {
            ref = ref.where(props.where)
         }

         // Require an orderBy for pagination
         const orderBy = props.orderBy ?? 'created_at'
         ref = ref.orderBy(orderBy)

         // Require a limit for pagination
         const limit = props.limit ?? 1000
         ref = ref.limit(limit ?? 1000)

         // Add startAt for pagination when provided
         if (props.startAt) {
            ref = ref.startAt(props.startAt)
         }

         const snapshot = await ref.get()
         const docs = snapshot.docs.map((doc: TFirestoreDoc) => {
            const path = doc.ref.path.split('/')
            return {
               id: doc.id,
               parent_collection: path[0],
               parent_doc: path[1],
               ...doc.data(),
            }
         })

         let result: TFirestoreDocsResponse = {
            count: docs.length,
            docs,
         }
         if (docs.length === limit) {
            const last = docs[docs.length - 1]
            result.startAt = last.data()[orderBy]
         }
         return result
      } catch (error) {
         // @ts-ignore
         throw new Error(error)
      }
   }

   async addDoc(props: TFirestoreAddDocProps) {
      try {
         let ref = firestore.collection(props.collection)
         if (props.id && props.subcollection) {
            ref = ref.doc(props.id).collection(props.subcollection)
         }
         const result = await ref.add({
            created_at: new Date().valueOf(),
            ...props.data,
         })
         if (result.id) {
            return result.id
         }
         throw new Error('Add doc failed')
      } catch (error) {
         // @ts-ignore
         throw new Error(error)
      }
   }

   async replaceDoc(props: TFirestoreUpdateDocProps) {
      try {
         let ref = firestore.collection(props.collection).doc(props.id)
         if (props.subcollection && props.subid) {
            ref = ref.collection(props.subcollection).doc(props.subid)
         }
         await ref.set({
            updated_at: new Date().valueOf(),
            ...props.data,
         })
         return true
      } catch (error) {
         // @ts-ignore
         throw new Error(error)
      }
   }

   async updateDoc(props: TFirestoreUpdateDocProps) {
      try {
         let ref = firestore.collection(props.collection).doc(props.id)
         if (props.subcollection && props.subid) {
            ref = ref.collection(props.subcollection).doc(props.subid)
         }
         await ref.update({
            updated_at: new Date().valueOf(),
            ...props.data,
         })
         return true
      } catch (error) {
         // @ts-ignore
         throw new Error(error)
      }
   }

   async deleteDoc(props: TFirestoreDeleteDocProps) {
      try {
         let ref = firestore.collection(props.collection).doc(props.id)
         if (props.subcollection && props.subid) {
            ref = ref.collection(props.subcollection).doc(props.subid)
         }
         await ref.delete()
         return true
      } catch (error) {
         // @ts-ignore
         throw new Error(error)
      }
   }
}
