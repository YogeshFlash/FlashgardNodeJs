/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothGattCharacteristic
 *  android.os.Parcel
 *  android.os.Parcelable
 *  android.os.Parcelable$Creator
 */
package com.inuker.bluetooth.library.c;

import android.bluetooth.BluetoothGattCharacteristic;
import android.os.Parcel;
import android.os.Parcelable;
import com.inuker.bluetooth.library.c.a;
import com.inuker.bluetooth.library.c.d;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class c
implements Parcelable {
    private List<d> b;
    public static final Parcelable.Creator<c> a = new Parcelable.Creator<c>(){

        public c a(Parcel parcel) {
            return new c(parcel);
        }

        public c[] a(int n2) {
            return new c[n2];
        }

        public /* synthetic */ Object[] newArray(int n2) {
            return this.a(n2);
        }

        public /* synthetic */ Object createFromParcel(Parcel parcel) {
            return this.a(parcel);
        }
    };

    public c(Map<UUID, Map<UUID, BluetoothGattCharacteristic>> map) {
        Iterator<Map.Entry<UUID, Map<UUID, BluetoothGattCharacteristic>>> iterator = map.entrySet().iterator();
        ArrayList<d> arrayList = new ArrayList<d>();
        while (iterator.hasNext()) {
            Map<UUID, BluetoothGattCharacteristic> map2;
            Map.Entry<UUID, Map<UUID, BluetoothGattCharacteristic>> entry = iterator.next();
            UUID uUID = entry.getKey();
            d d2 = new d(uUID, map2 = entry.getValue());
            if (arrayList.contains(d2)) continue;
            arrayList.add(d2);
        }
        this.a(arrayList);
    }

    public c(Parcel parcel) {
        parcel.readTypedList(this.a(), d.a);
    }

    public void a(List<d> list) {
        Collections.sort(list);
        this.a().addAll(list);
    }

    public List<d> a() {
        if (this.b == null) {
            this.b = new ArrayList<d>();
        }
        return this.b;
    }

    public d a(UUID uUID) {
        if (uUID == null) {
            return null;
        }
        List<d> list = this.a();
        for (d d2 : list) {
            if (!d2.a().equals(uUID)) continue;
            return d2;
        }
        return null;
    }

    public boolean a(UUID uUID, UUID uUID2) {
        List<a> list;
        if (uUID == null || uUID2 == null) {
            return false;
        }
        d d2 = this.a(uUID);
        if (d2 != null && !com.inuker.bluetooth.library.e.d.a(list = d2.b())) {
            for (a a2 : list) {
                if (!uUID2.equals(a2.a())) continue;
                return true;
            }
        }
        return false;
    }

    public void writeToParcel(Parcel parcel, int n2) {
        parcel.writeTypedList(this.a());
    }

    public int describeContents() {
        return 0;
    }

    public String toString() {
        StringBuilder stringBuilder = new StringBuilder();
        for (d d2 : this.b) {
            stringBuilder.append(d2).append("\n");
        }
        return stringBuilder.toString();
    }
}

