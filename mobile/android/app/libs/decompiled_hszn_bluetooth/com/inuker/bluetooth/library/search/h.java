/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Parcel
 *  android.os.Parcelable
 *  android.os.Parcelable$Creator
 */
package com.inuker.bluetooth.library.search;

import android.os.Parcel;
import android.os.Parcelable;

public class h
implements Parcelable {
    private int b;
    private int c;
    public static final Parcelable.Creator<h> a = new Parcelable.Creator<h>(){

        public h a(Parcel parcel) {
            return new h(parcel);
        }

        public h[] a(int n2) {
            return new h[n2];
        }

        public /* synthetic */ Object[] newArray(int n2) {
            return this.a(n2);
        }

        public /* synthetic */ Object createFromParcel(Parcel parcel) {
            return this.a(parcel);
        }
    };

    public int describeContents() {
        return 0;
    }

    public void writeToParcel(Parcel parcel, int n2) {
        parcel.writeInt(this.b);
        parcel.writeInt(this.c);
    }

    public h() {
    }

    public int a() {
        return this.b;
    }

    public void a(int n2) {
        this.b = n2;
    }

    public int b() {
        return this.c;
    }

    public void b(int n2) {
        this.c = n2;
    }

    protected h(Parcel parcel) {
        this.b = parcel.readInt();
        this.c = parcel.readInt();
    }
}

